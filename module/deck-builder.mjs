/**
 * Royal Blood — Dynamic Deck Builder.
 * Scans card image folders and creates/rebuilds decks from their contents.
 * Card names are derived from filenames (minus extension).
 */

// User data paths (survive system updates) and system fallback paths
const USER_DATA = "royal-blood-files";
const USER_CARD_FOLDERS = {
  major: `${USER_DATA}/cards/major`,
  minor: `${USER_DATA}/cards/minor`,
  court: `${USER_DATA}/cards/court`,
  backs: `${USER_DATA}/cards/backs`
};
const SYSTEM_CARD_FOLDERS = {
  major: "systems/royal-blood/cards/major",
  minor: "systems/royal-blood/cards/minor",
  court: "systems/royal-blood/cards/court",
  backs: "systems/royal-blood/cards/backs"
};

/**
 * List image files in a Foundry data folder.
 * Returns array of { name, path } sorted by filename.
 */
async function _listImages(folder) {
  try {
    const result = await foundry.applications.apps.FilePicker.implementation.browse("data", folder, { extensions: [".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"] });
    return result.files
      .map(path => {
        const filename = decodeURIComponent(path.split("/").pop());
        const name = filename.replace(/\.[^.]+$/, ""); // strip extension
        return { name, path };
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  } catch (e) {
    // Silently fail — folder may not exist
    return [];
  }
}

/**
 * List images, checking user data folder first then system folder.
 */
async function _listImagesWithFallback(key) {
  const userImages = await _listImages(USER_CARD_FOLDERS[key]);
  if (userImages.length > 0) return userImages;
  return _listImages(SYSTEM_CARD_FOLDERS[key]);
}

/**
 * Get the first card back image from the backs folder.
 */
async function _getBackImage() {
  const backs = await _listImagesWithFallback("backs");
  return backs.length > 0 ? backs[0].path : "";
}

/**
 * Build card data array from a list of image files.
 */
function _buildCards(images, suit = "") {
  return images.map((img, index) => ({
    name: img.name,
    type: "base",
    suit: suit,
    value: index,
    face: 0,
    faces: [{ name: img.name, img: img.path }]
  }));
}

/**
 * Create a deck if it doesn't already exist.
 * Returns the existing or newly created Cards document.
 */
async function _createDeckIfMissing(name, type, description, cards, backImg) {
  const existing = game.cards.find(c => c.name === name);
  if (existing) {
    console.log(`Royal Blood | ${name} already exists, skipping.`);
    return existing;
  }

  const data = {
    name,
    type,
    img: backImg,
    description,
    cards
  };

  const doc = await Cards.create(data);
  if (type === "deck") await doc.shuffle();
  console.log(`Royal Blood | Created ${type}: ${name} (${cards.length} cards)`);
  return doc;
}

/**
 * Scan all card folders and create decks from their contents.
 * Only creates decks that don't already exist.
 */
export async function setupDecks() {
  const backImg = await _getBackImage();

  // Major Arcana
  const majorImages = await _listImagesWithFallback("major");
  if (majorImages.length > 0) {
    await _createDeckIfMissing(
      "Major Arcana", "deck",
      `${majorImages.length} Major Arcana cards for the spread.`,
      _buildCards(majorImages, "major"),
      backImg
    );
  } else {
    ui.notifications.warn("No images found in cards/major/ folder.");
  }

  // Minor Arcana (pip cards)
  const minorImages = await _listImagesWithFallback("minor");
  if (minorImages.length > 0) {
    await _createDeckIfMissing(
      "Minor Arcana", "deck",
      `${minorImages.length} Minor Arcana pip cards and Jokers for resolution.`,
      _buildCards(minorImages, "minor"),
      backImg
    );
  } else {
    ui.notifications.warn("No images found in cards/minor/ folder.");
  }

  // Court Cards
  const courtImages = await _listImagesWithFallback("court");
  if (courtImages.length > 0) {
    await _createDeckIfMissing(
      "Court Cards", "deck",
      `${courtImages.length} court cards for character selection.`,
      _buildCards(courtImages, "court"),
      backImg
    );
  } else {
    ui.notifications.warn("No images found in cards/court/ folder.");
  }

  // Fate's Table pile
  const existingTable = game.cards.find(c => c.name === "Fate's Table");
  if (!existingTable) {
    await Cards.create({
      name: "Fate's Table",
      type: "pile",
      img: backImg,
      description: "The play area where Fate Herself reveals drawn cards."
    });
    console.log("Royal Blood | Created Fate's Table pile.");
  }

  ui.notifications.info("Royal Blood decks are ready.");
}

/**
 * Delete all Royal Blood card stacks and rebuild from folder contents.
 */
export async function rebuildDecks() {
  const names = ["Major Arcana", "Minor Arcana", "Court Cards", "Fate's Table"];
  for (const name of names) {
    const existing = game.cards.find(c => c.name === name);
    if (existing) {
      await existing.delete();
      console.log(`Royal Blood | Deleted: ${name}`);
    }
  }
  await setupDecks();
}
