import { PromptEngine } from "./engine.js";
import { enforcePreventiveOptions, resolveConflicts } from "./conflictResolver.js";
import { renderCameraPreview } from "./cameraPreview.js";

const $ = (id) => document.getElementById(id);
const fields = ["ratio", "idea", "camera", "lighting", "details", "texture", "emotion", "physics", "style", "negative"];

const lensState = { shotType: "", lensType: "", aperture: "" };
const engine = new PromptEngine(updateEngineStatus);

init();

function init() {
  bindAppendSelects();
  bindLensSelects();
  bindButtons();
  bindKeyboard();
  bindScrollEffects();
  updateRatio();
  compileCamera();
  renderCameraPreview($("cameraPreview"), lensState);
}

function bindAppendSelects() {
  document.querySelectorAll("select[data-append]").forEach((select) => {
    select.addEventListener("change", () => {
      const targetId = select.getAttribute("data-append");
      appendToInput(targetId, select.value);
      select.selectedIndex = 0;
      runResolver(true);
    });
  });

  $("ratioSelect").addEventListener("change", () => {
    updateRatio();
    runResolver(true);
  });
}

function bindLensSelects() {
  document.querySelectorAll("select[data-lens]").forEach((select) => {
    select.addEventListener("change", () => {
      lensState[select.getAttribute("data-lens")] = select.value;
      compileCamera();
      enforcePreventiveOptions($("lensTypeSelect"), $("shotTypeSelect"));
      runResolver(true);
      renderCameraPreview($("cameraPreview"), lensState);
      $("previewMeta").textContent = `${lensState.shotType || "Shot"} • ${lensState.lensType || "Lens"} • ${lensState.aperture || "Aperture"}`;
    });
  });
}

function bindButtons() {
  $("compileBtn").addEventListener("click", () => compilePrompt(true));
  $("copyBtn").addEventListener("click", copyPrompt);
  $("exportJsonBtn").addEventListener("click", exportJSON);
  $("themeToggle").addEventListener("click", toggleTheme);

  $("downloadLLMBtn").addEventListener("click", async () => llmInit(false));
  $("loadLLMBtn").addEventListener("click", async () => llmInit(true));
  $("aiFixBtn").addEventListener("click", async () => runAiFix("sanity"));
  $("smartSuggestBtn").addEventListener("click", async () => runAiFix("smart"));
}

function bindKeyboard() {
  window.addEventListener("keydown", (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") {
      ev.preventDefault();
      compilePrompt(true);
    }
  });
}

function bindScrollEffects() {
  const sticky = $("stickyActions");
  const bg = document.querySelector(".bg-layer");
  window.addEventListener("scroll", () => {
    sticky.classList.toggle("show", window.scrollY > 340);
    bg.style.transform = `translateY(${window.scrollY * 0.08}px)`;
  }, { passive: true });
}

function updateRatio() {
  const ratio = $("ratioSelect").value;
  $("ratio").value = ratio ? `set aspect ratio to ${ratio}` : "";
}

function appendToInput(id, token) {
  if (!token) return;
  const input = $(id);
  if (!input) return;
  const base = input.value.trim();
  input.value = base ? (base.toLowerCase().includes(token.toLowerCase()) ? base : `${base}, ${token}`) : token;
}

function compileCamera() {
  $("camera").value = [lensState.shotType, lensState.lensType, lensState.aperture].filter(Boolean).join(", ");
}

function runResolver(showToasts = false) {
  const state = readState();
  const { state: updated, changes } = resolveConflicts(state);

  if (changes.length) {
    lensState.shotType = updated.shotType;
    lensState.lensType = updated.lensType;
    lensState.aperture = updated.aperture;
    $("idea").value = updated.idea;
    $("physics").value = updated.physics;
    compileCamera();
    syncLensSelects();
    if (showToasts) changes.forEach((change) => toast(change.message));
  }
  return changes;
}

function readState() {
  return {
    idea: $("idea").value.trim(),
    camera: $("camera").value.trim(),
    physics: $("physics").value.trim(),
    shotType: lensState.shotType,
    lensType: lensState.lensType,
    aperture: lensState.aperture
  };
}

function compilePrompt(reveal = false) {
  runResolver(true);
  const strictMode = $("strictMode").checked;
  const parts = [];
  if ($("ratio").value.trim()) parts.push(`• The Format: ${$("ratio").value.trim()}`);
  if ($("idea").value.trim()) parts.push(`• The Idea: ${$("idea").value.trim()}`);

  const detail = [$("details").value.trim(), $("texture").value.trim() ? `Texture: ${$("texture").value.trim()}` : "", $("physics").value.trim() ? `Physics: ${$("physics").value.trim()}` : ""].filter(Boolean).join(", ");
  if (detail) parts.push(`• The Details: ${detail}`);

  if ($("camera").value.trim()) parts.push(`• The Camera: ${$("camera").value.trim()}`);

  const lighting = [$("lighting").value.trim(), $("emotion").value.trim() ? `Mood: ${$("emotion").value.trim()}` : ""].filter(Boolean).join(", ");
  if (lighting) parts.push(`• The Colors & Lighting: ${lighting}`);

  if ($("style").value.trim()) parts.push(`• The Style: ${$("style").value.trim()}`);
  if ($("negative").value.trim()) parts.push(`• The Negative: ${$("negative").value.trim()}`);
  if (strictMode) parts.push("\nExactly matching the description. Strict adherence to the configuration.");

  $("finalPrompt").value = parts.join("\n");
  if (reveal) {
    $("outputSection").classList.add("revealed");
    $("outputSection").style.display = "block";
  }
}

async function llmInit(expectLocal) {
  const model = $("modelSelect").value;
  setLLMButtons(true);
  try {
    await engine.initialize(model, expectLocal);
    $("aiFixBtn").disabled = false;
    $("smartSuggestBtn").disabled = false;
    toast("✅ AI engine ready.");
  } catch (err) {
    toast(`❌ Engine error: ${err.message}`);
    updateEngineStatus({ message: err.message, mode: "danger" });
  } finally {
    setLLMButtons(false);
  }
}

async function runAiFix(mode) {
  compilePrompt(true);
  runResolver(true);

  const raw = $("finalPrompt").value.trim();
  if (!raw) return toast("Add content before AI actions.");
  const btn = mode === "sanity" ? $("aiFixBtn") : $("smartSuggestBtn");
  btn.disabled = true;

  try {
    const result = mode === "sanity" ? await engine.sanityCheck(raw) : await engine.smartSuggest(raw);
    $("finalPrompt").value = result;
    toast(mode === "sanity" ? "✨ AI sanity check complete." : "✨ Smart suggestions applied.");
  } catch (err) {
    toast(`❌ AI failed: ${err.message}`);
  } finally {
    btn.disabled = false;
  }
}

function setLLMButtons(disabled) {
  $("downloadLLMBtn").disabled = disabled;
  $("loadLLMBtn").disabled = disabled;
}

function updateEngineStatus({ message, mode }) {
  const dot = $("statusDot");
  dot.className = `status-dot ${mode === "ready" ? "ready" : mode === "loading" ? "loading" : ""}`;
  $("llmStatusText").textContent = message;
}

function copyPrompt(ev) {
  const text = $("finalPrompt").value;
  if (!text.trim()) return toast("Nothing to copy.");

  const mode = document.querySelector('input[name="copyMode"]:checked')?.value || "plain";
  const payload = mode === "markdown" ? `\`\`\`\n${text}\n\`\`\`` : text;

  navigator.clipboard.writeText(payload)
    .then(() => {
      const btn = $("copyBtn");
      btn.style.setProperty("--x", `${ev?.offsetX || 16}px`);
      btn.style.setProperty("--y", `${ev?.offsetY || 16}px`);
      btn.classList.remove("copy-ripple");
      void btn.offsetWidth;
      btn.classList.add("copy-ripple");
      toast(`Copied as ${mode === "markdown" ? "Markdown" : "Plain Text"}.`);
    })
    .catch(() => toast("Clipboard unavailable in this environment."));
}

function exportJSON() {
  const data = Object.fromEntries(fields.map((name) => [name, $(name).value]));
  data.copyMode = document.querySelector('input[name="copyMode"]:checked')?.value || "plain";
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cinematic-prompt.json";
  a.click();
  URL.revokeObjectURL(url);
  toast("Exported prompt JSON.");
}

function toggleTheme() {
  const root = document.documentElement;
  root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
}

function toast(message) {
  const wrap = $("toastStack");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  wrap.prepend(el);
  setTimeout(() => el.remove(), 3600);
}

function syncLensSelects() {
  setSelectValue($("shotTypeSelect"), lensState.shotType);
  setSelectValue($("lensTypeSelect"), lensState.lensType);
  setSelectValue($("apertureSelect"), lensState.aperture);
  renderCameraPreview($("cameraPreview"), lensState);
}

function setSelectValue(select, value) {
  const match = [...select.options].find((o) => o.value === value);
  if (match) select.value = value;
}
