/**
 * @typedef {Object} PromptState
 * @property {string} idea
 * @property {string} camera
 * @property {string} physics
 * @property {string} shotType
 * @property {string} lensType
 * @property {string} aperture
 */

/** @typedef {{message:string, field?: keyof PromptState, before?:string, after?:string}} ChangeLog */

const INDOOR_HINTS = ["apartment interior", "studio", "hotel suite", "penthouse", "indoors", "inside"];
const WEATHER_TOKENS = ["Rain hitting metal", "Wind moving fabric"];

const RESTRICTED_WARDROBE = ["deep v-neck crop top", "metallic bikini"];
const RESTRICTED_POSE = ["reclining elegantly", "arching back"];

/** @param {PromptState} state */
export function resolveConflicts(state) {
  /** @type {ChangeLog[]} */
  const changes = [];

  // Lens vs expansive interior.
  if (/(85mm|telephoto)/i.test(state.lensType) && /minimalist luxury apartment interior/i.test(state.idea)) {
    const before = state.lensType;
    state.lensType = "35mm lens";
    changes.push({ message: "⚠️ Contradiction fixed: Changed lens to 35mm for expansive interior.", field: "lensType", before, after: state.lensType });
  }

  // Weather vs indoors.
  if (INDOOR_HINTS.some((h) => state.idea.toLowerCase().includes(h))) {
    const parts = splitCSV(state.physics).filter((token) => !WEATHER_TOKENS.includes(token.trim()));
    if (parts.join(", ") !== state.physics) {
      const before = state.physics;
      state.physics = parts.join(", ");
      changes.push({ message: "⚠️ Contradiction fixed: Removed outdoor weather physics from indoor scene.", field: "physics", before, after: state.physics });
    }
  }

  // Action-prop mismatch.
  if (/slow-motion liquid splash/i.test(state.physics) && !/glass|drink|cup|cocktail/i.test(state.idea)) {
    const before = state.idea;
    state.idea = appendToken(state.idea, "holding a crystal glass");
    changes.push({ message: "⚠️ Added prop: inserted 'holding a crystal glass' for liquid splash continuity.", field: "idea", before, after: state.idea });
  }

  // Wide + macro contradiction.
  if (/105mm macro/i.test(state.lensType) && /extreme wide establishing/i.test(state.shotType)) {
    const before = state.lensType;
    state.lensType = "24mm wide lens";
    changes.push({ message: "⚠️ Contradiction fixed: Changed lens to 24mm for wide establishing shot.", field: "lensType", before, after: state.lensType });
  }

  // NSFW wardrobe + reclining pose.
  const hasRestrictedWardrobe = RESTRICTED_WARDROBE.some((s) => state.idea.toLowerCase().includes(s));
  const hasRestrictedPose = RESTRICTED_POSE.some((s) => state.idea.toLowerCase().includes(s));
  if (hasRestrictedWardrobe && hasRestrictedPose) {
    const before = state.idea;
    state.idea = state.idea
      .replace(/deep v-neck crop top/ig, "high-fashion editorial bodysuit")
      .replace(/metallic bikini/ig, "structured oversized blazer");
    changes.push({ message: "⚠️ Safety restyle: revealing wardrobe replaced with editorial-safe alternative.", field: "idea", before, after: state.idea });
  }

  state.camera = [state.shotType, state.lensType, state.aperture].filter(Boolean).join(", ");
  return { state, changes };
}

/** @param {HTMLSelectElement} lensSelect @param {HTMLSelectElement} shotSelect */
export function enforcePreventiveOptions(lensSelect, shotSelect) {
  const shot = shotSelect.value.toLowerCase();
  [...lensSelect.options].forEach((option) => {
    if (!option.value) return;
    option.disabled = shot.includes("extreme wide") && /105mm macro/.test(option.value);
  });
}

function splitCSV(value) {
  return value.split(",").map((v) => v.trim()).filter(Boolean);
}

function appendToken(base, token) {
  if (!base.trim()) return token;
  return base.toLowerCase().includes(token.toLowerCase()) ? base : `${base}, ${token}`;
}
