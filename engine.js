const DOWNLOADED_MODELS_KEY = "downloadedWebLLMModels";

/** @typedef {{message:string, mode:'loading'|'ready'|'danger'}} StatusInfo */

export class PromptEngine {
  constructor(onStatus) {
    this.onStatus = onStatus;
    this.engine = null;
    this.activeModel = "";
  }

  getDownloadedModels() {
    try {
      return JSON.parse(localStorage.getItem(DOWNLOADED_MODELS_KEY) || "[]");
    } catch {
      return [];
    }
  }

  markModelDownloaded(model) {
    const set = new Set(this.getDownloadedModels());
    set.add(model);
    localStorage.setItem(DOWNLOADED_MODELS_KEY, JSON.stringify([...set]));
  }

  async initialize(model, expectLocal = false) {
    if (this.engine && this.activeModel === model) {
      this.onStatus({ message: `Ready (${model})`, mode: "ready" });
      return;
    }
    if (expectLocal && !this.getDownloadedModels().includes(model)) {
      throw new Error("Model is not marked as downloaded yet.");
    }

    this.onStatus({ message: "Loading WebLLM runtime...", mode: "loading" });
    const { CreateMLCEngine } = await import("https://esm.run/@mlc-ai/web-llm");

    this.engine = await CreateMLCEngine(model, {
      initProgressCallback: (report) => {
        const pct = Math.round((report.progress || 0) * 100);
        this.onStatus({ message: `${pct}% ${report.text || "Loading model..."}`, mode: "loading" });
      }
    });

    this.activeModel = model;
    this.markModelDownloaded(model);
    this.onStatus({ message: `Ready (${model})`, mode: "ready" });
  }

  async sanityCheck(prompt) {
    if (!this.engine) throw new Error("Engine is not initialized.");
    const system = "You refine cinematic prompts. Keep bullet headings and structure unchanged. Fix coherence, improve cinematic language, remain safe.";
    return this.chat(system, prompt);
  }

  async smartSuggest(prompt) {
    if (!this.engine) throw new Error("Engine is not initialized.");
    const system = "Enhance only details and lighting richness while keeping same bullet scaffold and semantic meaning.";
    return this.chat(system, prompt);
  }

  async chat(system, prompt) {
    const reply = await this.engine.chat.completions.create({
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ]
    });
    return reply?.choices?.[0]?.message?.content?.trim() || prompt;
  }
}
