/**
 * Royal Blood — Major Arcana card names.
 * Descriptions can be provided via a custom major-arcana-data.json file
 * placed in the royal-blood-files/cards/ folder in your Foundry Data directory.
 */

export const MAJOR_ARCANA = [
  { name: "The Fool", subtitle: "", description: "", person: "", location: "", object: "" },
  { name: "The Magician", subtitle: "", description: "", person: "", location: "", object: "" },
  { name: "The High Priestess", subtitle: "", description: "", person: "", location: "", object: "" },
  { name: "The Empress", subtitle: "", description: "", person: "", location: "", object: "" },
  { name: "The Emperor", subtitle: "", description: "", person: "", location: "", object: "" },
  { name: "The Hierophant", subtitle: "", description: "", person: "", location: "", object: "" },
  { name: "The Lovers", subtitle: "", description: "", person: "", location: "", object: "" },
  { name: "The Chariot", subtitle: "", description: "", person: "", location: "", object: "" },
  { name: "Justice", subtitle: "", description: "", person: "", location: "", object: "" },
  { name: "The Hermit", subtitle: "", description: "", person: "", location: "", object: "" },
  { name: "Wheel of Fortune", subtitle: "", description: "", person: "", location: "", object: "" },
  { name: "Strength", subtitle: "", description: "", person: "", location: "", object: "" },
  { name: "The Hanged Man", subtitle: "", description: "", person: "", location: "", object: "" },
  { name: "Death", subtitle: "", description: "", person: "", location: "", object: "" },
  { name: "Temperance", subtitle: "", description: "", person: "", location: "", object: "" },
  { name: "The Devil", subtitle: "", description: "", person: "", location: "", object: "" },
  { name: "The Tower", subtitle: "", description: "", person: "", location: "", object: "" },
  { name: "The Star", subtitle: "", description: "", person: "", location: "", object: "" },
  { name: "The Moon", subtitle: "", description: "", person: "", location: "", object: "" },
  { name: "The Sun", subtitle: "", description: "", person: "", location: "", object: "" },
  { name: "Judgement", subtitle: "", description: "", person: "", location: "", object: "" },
  { name: "The World", subtitle: "", description: "", person: "", location: "", object: "" }
];

const USER_DATA = "royal-blood-files";
const CUSTOM_DATA_FOLDERS = [
  { folder: `${USER_DATA}/cards`, path: `${USER_DATA}/cards/major-arcana-data.json` },
  { folder: "systems/royal-blood/cards", path: "systems/royal-blood/cards/major-arcana-data.json" }
];

let _mergedData = null;

/**
 * Load custom arcana data from JSON if it exists, merged with built-in defaults.
 * Custom entries override built-in ones by name (fuzzy match).
 * Checks user data folder first, then system folder.
 */
export async function loadArcanaData() {
  if (_mergedData) return _mergedData;

  let customData = [];
  for (const { folder, path } of CUSTOM_DATA_FOLDERS) {
    try {
      const check = await foundry.applications.apps.FilePicker.implementation.browse("data", folder, { extensions: [".json"] });
      const hasCustom = check.files?.some(f => f.endsWith("major-arcana-data.json"));
      if (hasCustom) {
        const response = await fetch(path);
        if (response.ok) {
          customData = await response.json();
          console.log(`Royal Blood | Loaded custom arcana data (${customData.length} entries).`);
          break;
        }
      }
    } catch { /* try next folder */ }
  }

  // Start with built-in data, override with custom entries by name match
  _mergedData = MAJOR_ARCANA.map(entry => {
    const custom = customData.find(c =>
      c.name && entry.name.toLowerCase().includes(c.name.toLowerCase())
    );
    return custom ? { ...entry, ...custom } : entry;
  });

  // Add any custom entries that don't match a built-in card
  for (const custom of customData) {
    const exists = _mergedData.find(e =>
      e.name.toLowerCase().includes(custom.name.toLowerCase()) ||
      custom.name.toLowerCase().includes(e.name.toLowerCase())
    );
    if (!exists) _mergedData.push(custom);
  }

  return _mergedData;
}

/**
 * Look up arcana data by card name (fuzzy match on the name portion).
 */
export function findArcanaData(cardName) {
  const data = _mergedData || MAJOR_ARCANA;
  const lower = cardName.toLowerCase();
  return data.find(a => lower.includes(a.name.toLowerCase()));
}
