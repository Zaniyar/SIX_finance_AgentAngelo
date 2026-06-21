// The 15 Oculus/OVR visemes — the morph-target contract shared by Ready Player
// Me avatars and Rocketbox avatars converted with TalkingHead's
// rename-rocketbox-shapekeys.py. The Avatar maps these names onto whatever GLB
// is loaded; anything missing is simply skipped.
export const VISEMES = [
  "viseme_sil", "viseme_PP", "viseme_FF", "viseme_TH", "viseme_DD",
  "viseme_kk", "viseme_CH", "viseme_SS", "viseme_nn", "viseme_RR",
  "viseme_aa", "viseme_E", "viseme_I", "viseme_O", "viseme_U",
] as const;

export type VisemeMap = Partial<Record<string, number>>;

// Vowel-ish shapes we cycle through while speaking to give the mouth variety.
export const OPEN_VISEMES = ["viseme_aa", "viseme_E", "viseme_O", "viseme_I", "viseme_U"];
// Closure shapes used on word boundaries for a bilabial "snap".
export const CLOSED_VISEMES = ["viseme_PP", "viseme_FF", "viseme_nn"];

// Candidate ARKit blink morph names across avatar conventions.
export const BLINK_TARGETS = ["eyeBlinkLeft", "eyeBlinkRight", "blink", "eyesClosed"];
