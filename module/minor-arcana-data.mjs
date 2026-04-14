/**
 * Royal Blood — Minor Arcana suit touchstones.
 * Touchstones can be provided via a custom touchstones.json file
 * placed in the royal-blood-files/cards/ folder in your Foundry Data directory.
 */

export const MINOR_SUITS = [
  { suit: "wands", element: "", themes: "", opposedBy: "", lead: [], silver: [] },
  { suit: "cups", element: "", themes: "", opposedBy: "", lead: [], silver: [] },
  { suit: "swords", element: "", themes: "", opposedBy: "", lead: [], silver: [] },
  { suit: "pentacles", element: "", themes: "", opposedBy: "", lead: [], silver: [] }
];

const USER_DATA = "royal-blood-files";
const CUSTOM_DATA_FOLDERS = [
  { folder: `${USER_DATA}/cards`, path: `${USER_DATA}/cards/touchstones.json` },
  { folder: "systems/royal-blood/cards", path: "systems/royal-blood/cards/touchstones.json" }
];

let _mergedData = null;

/**
 * Load custom touchstone data from JSON if it exists, merged with built-in defaults.
 * Custom entries override built-in ones by suit.
 */
export async function loadTouchstones() {
  if (_mergedData) return _mergedData;

  let customData = [];
  for (const { folder, path } of CUSTOM_DATA_FOLDERS) {
    try {
      const check = await foundry.applications.apps.FilePicker.implementation.browse("data", folder, { extensions: [".json"] });
      const hasCustom = check.files?.some(f => f.endsWith("touchstones.json"));
      if (hasCustom) {
        const response = await fetch(path);
        if (response.ok) {
          customData = await response.json();
          console.log(`Royal Blood | Loaded custom touchstones (${customData.length} suits).`);
          break;
        }
      }
    } catch { /* try next folder */ }
  }

  _mergedData = MINOR_SUITS.map(entry => {
    const custom = customData.find(c =>
      c.suit && entry.suit.toLowerCase() === c.suit.toLowerCase()
    );
    return custom ? { ...entry, ...custom } : entry;
  });

  return _mergedData;
}

/**
 * Look up touchstone data by card name (extracts suit from the name).
 */
export function findTouchstones(cardName) {
  const data = _mergedData || MINOR_SUITS;
  const lower = cardName.toLowerCase();
  for (const entry of data) {
    if (lower.includes(entry.suit.toLowerCase())) return entry;
  }
  return null;
}
