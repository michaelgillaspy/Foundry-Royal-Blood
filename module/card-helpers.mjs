/**
 * Royal Blood — Card helper functions.
 * Major Arcana = the spread (persistent on map).
 * Minor Arcana = drawn to resolve actions (temporary).
 * Exposed on game.royalblood so macros can call them.
 */

import { MAJOR_ARCANA, findArcanaData } from "./major-arcana-data.mjs";

const CARD_TILE_WIDTH = 420;
const CARD_TILE_HEIGHT = 720;
const NOTE_WIDTH = 420;
const NOTE_SPACING = 20;
const USER_DATA = "royal-blood-files";
const NOTES_FOLDER = `${USER_DATA}/notes`;
const BACKS_FOLDER_USER = `${USER_DATA}/cards/backs`;
const BACKS_FOLDER_SYSTEM = "systems/royal-blood/cards/backs";

// ─── User Data Folder Setup ─────────────────────────────────────

const USER_DATA_FOLDERS = [
  USER_DATA,
  `${USER_DATA}/cards`,
  `${USER_DATA}/cards/major`,
  `${USER_DATA}/cards/minor`,
  `${USER_DATA}/cards/court`,
  `${USER_DATA}/cards/backs`,
  `${USER_DATA}/tokens`,
  `${USER_DATA}/tokens/coin`,
  `${USER_DATA}/notes`,
  `${USER_DATA}/backgrounds`
];

/**
 * Create the full royal-blood-files folder tree if it doesn't exist.
 */
export async function ensureUserDataFolders() {
  const fp = foundry.applications.apps.FilePicker.implementation;
  for (const folder of USER_DATA_FOLDERS) {
    try {
      await fp.browse("data", folder);
    } catch {
      try {
        await fp.createDirectory("data", folder);
      } catch { /* already exists or parent missing — skip */ }
    }
  }
}

// ─── Themes ─────────────────────────────────────────────────────

const THEMES = {
  parchment: {
    label: "Parchment",
    sceneBg: "#f5f0e8",
    noteBg: "#e8e0d0",
    border: "#2a2a2a",
    accent: "#c9a84c",
    text: "#1a1a1a",
    headerBg: "#2a2a2a",
    headerText: "#c9a84c",
    placeholder: "#999",
    speckleColor: "#6b5b3e"
  },
  dark: {
    label: "Dark",
    sceneBg: "#111111",
    noteBg: "#222222",
    border: "#c0c0c0",
    accent: "#c0c0c0",
    text: "#e8e4dc",
    headerBg: "#c0c0c0",
    headerText: "#1a1a1a",
    placeholder: "#666",
    speckleColor: "#333"
  },
  light: {
    label: "Light",
    sceneBg: "#faf9f6",
    noteBg: "#d8d6d2",
    border: "#2a2a2a",
    accent: "#a8a8a8",
    text: "#1a1a1a",
    headerBg: "#2a2a2a",
    headerText: "#c0c0c0",
    placeholder: "#aaa",
    speckleColor: "#ccc"
  }
};

function _getTheme() {
  const key = game.settings?.get("royal-blood", "theme") ?? "parchment";
  return THEMES[key] || THEMES.parchment;
}

/**
 * Get the first card back image from the backs folder.
 */
async function _getCardBackImg() {
  const exts = { extensions: [".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"] };
  for (const folder of [BACKS_FOLDER_USER, BACKS_FOLDER_SYSTEM]) {
    try {
      const result = await foundry.applications.apps.FilePicker.implementation.browse("data", folder, exts);
      if (result.files.length > 0) return result.files[0];
    } catch { /* folder doesn't exist, try next */ }
  }
  return "";
}

// ─── Scene Background Renderer ───────────────────────────────────

const BG_FOLDER = `${USER_DATA}/backgrounds`;

async function _ensureBgFolder() {
  try {
    await foundry.applications.apps.FilePicker.implementation.browse("data", BG_FOLDER);
  } catch {
    await foundry.applications.apps.FilePicker.implementation.createDirectory("data", BG_FOLDER);
  }
}

/**
 * Render a parchment-style scene background with borders and ornaments.
 */
async function _renderSceneBackground(sceneWidth, sceneHeight) {
  const theme = _getTheme();
  // Cap render resolution for performance
  const maxDim = 4096;
  const ratio = Math.min(1, maxDim / Math.max(sceneWidth, sceneHeight));
  const w = Math.round(sceneWidth * ratio);
  const h = Math.round(sceneHeight * ratio);

  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");

  const borderOuter = 20;
  const borderInner = 6;
  const gap = 10;

  // Background
  ctx.fillStyle = theme.sceneBg;
  ctx.fillRect(0, 0, w, h);

  // Subtle texture — randomized speckles
  ctx.globalAlpha = 0.03;
  ctx.fillStyle = theme.speckleColor;
  for (let i = 0; i < 8000; i++) {
    const sx = Math.random() * w;
    const sy = Math.random() * h;
    const sr = Math.random() * 2 + 0.5;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1.0;

  // Outer border
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = borderOuter;
  ctx.strokeRect(borderOuter / 2, borderOuter / 2, w - borderOuter, h - borderOuter);

  // Inner accent border
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = borderInner;
  const innerX = borderOuter + gap + borderInner / 2;
  const innerY = borderOuter + gap + borderInner / 2;
  const innerW = w - (borderOuter + gap + borderInner / 2) * 2;
  const innerH = h - (borderOuter + gap + borderInner / 2) * 2;
  ctx.strokeRect(innerX, innerY, innerW, innerH);

  // Corner ornaments (accent diamonds)
  const ornamentSize = 16;
  const corners = [
    [innerX, innerY],
    [innerX + innerW, innerY],
    [innerX, innerY + innerH],
    [innerX + innerW, innerY + innerH]
  ];
  ctx.fillStyle = theme.accent;
  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - ornamentSize);
    ctx.lineTo(cx + ornamentSize, cy);
    ctx.lineTo(cx, cy + ornamentSize);
    ctx.lineTo(cx - ornamentSize, cy);
    ctx.closePath();
    ctx.fill();
  }

  // Filigree lines along each edge (midpoint accents)
  const filigreeLen = 60;
  const filigreeOffset = borderOuter + gap + borderInner + 8;
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2;

  // Top & bottom midpoints
  const midX = w / 2;
  ctx.beginPath();
  ctx.moveTo(midX - filigreeLen, filigreeOffset);
  ctx.lineTo(midX + filigreeLen, filigreeOffset);
  ctx.moveTo(midX - filigreeLen, h - filigreeOffset);
  ctx.lineTo(midX + filigreeLen, h - filigreeOffset);
  ctx.stroke();

  // Left & right midpoints
  const midY = h / 2;
  ctx.beginPath();
  ctx.moveTo(filigreeOffset, midY - filigreeLen);
  ctx.lineTo(filigreeOffset, midY + filigreeLen);
  ctx.moveTo(w - filigreeOffset, midY - filigreeLen);
  ctx.lineTo(w - filigreeOffset, midY + filigreeLen);
  ctx.stroke();

  // Small diamond at each edge midpoint
  const mdSize = 8;
  const midpoints = [
    [midX, filigreeOffset],
    [midX, h - filigreeOffset],
    [filigreeOffset, midY],
    [w - filigreeOffset, midY]
  ];
  ctx.fillStyle = theme.accent;
  for (const [mx, my] of midpoints) {
    ctx.beginPath();
    ctx.moveTo(mx, my - mdSize);
    ctx.lineTo(mx + mdSize, my);
    ctx.lineTo(mx, my + mdSize);
    ctx.lineTo(mx - mdSize, my);
    ctx.closePath();
    ctx.fill();
  }

  const blob = await new Promise(resolve => c.toBlob(resolve, "image/png"));
  return blob;
}

/**
 * Generate and upload a scene background, returning the file path.
 */
async function _uploadSceneBackground(sceneName, width, height) {
  await _ensureBgFolder();
  const blob = await _renderSceneBackground(width, height);
  const filename = `${sceneName.replace(/[^a-zA-Z0-9]/g, "_")}_bg.png`;
  const file = new File([blob], filename, { type: "image/png" });
  const response = await foundry.applications.apps.FilePicker.implementation.upload(
    "data", BG_FOLDER, file
  );
  return response.path;
}

// ─── Notes Image Renderer ────────────────────────────────────────

/**
 * Ensure the notes image folder exists in the Foundry data directory.
 */
async function _ensureNotesFolder() {
  try {
    await foundry.applications.apps.FilePicker.implementation.browse("data", NOTES_FOLDER);
  } catch {
    await foundry.applications.apps.FilePicker.implementation.createDirectory("data", NOTES_FOLDER);
  }
}

/**
 * Word-wrap text on a canvas 2D context.
 */
function _wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const paragraphs = text.split("\n");
  let currentY = y;

  for (const para of paragraphs) {
    if (para === "") {
      currentY += lineHeight;
      continue;
    }
    const words = para.split(" ");
    let line = "";

    for (const word of words) {
      const testLine = line ? line + " " + word : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && line) {
        ctx.fillText(line, x, currentY);
        line = word;
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  }
}

/**
 * Count how many wrapped lines a block of text will produce at a given font/width.
 * Uses an offscreen canvas for measurement.
 */
function _countWrappedLines(text, font, maxWidth) {
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  ctx.font = font;

  let lines = 0;
  const paragraphs = text.split("\n");
  for (const para of paragraphs) {
    if (para === "") { lines++; continue; }
    const words = para.split(" ");
    let line = "";
    for (const word of words) {
      const testLine = line ? line + " " + word : word;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        lines++;
        line = word;
      } else {
        line = testLine;
      }
    }
    lines++; // final line of paragraph
  }
  return lines;
}

/**
 * Render a styled notes image for a Major Arcana card.
 * Height auto-expands when text overflows.
 * Returns { blob, height } where height is the actual pixel height used.
 */
async function _renderNotesImage(cardName, notesText) {
  const theme = _getTheme();
  const scale = 2;
  const w = NOTE_WIDTH;

  const borderOuter = 6;
  const borderInner = 2;
  const gap = 4;
  const headerHeight = 44;
  const inset = borderOuter + gap + borderInner;
  const textPadding = 18;
  const lineHeight = 34;
  const textMaxWidth = w - inset * 2 - textPadding * 2;
  const textFont = "26px Signika, Palatino Linotype, serif";

  // Calculate required height based on text content
  const textTopOffset = inset + headerHeight + textPadding + 14;
  let textLines = 2; // default placeholder lines
  if (notesText) {
    textLines = _countWrappedLines(notesText, textFont, textMaxWidth);
  }
  const textBottom = textTopOffset + textLines * lineHeight + textPadding;
  const h = Math.max(CARD_TILE_HEIGHT, textBottom + inset);

  const c = document.createElement("canvas");
  c.width = w * scale;
  c.height = h * scale;
  const ctx = c.getContext("2d");
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = theme.noteBg;
  ctx.fillRect(0, 0, w, h);

  // Outer border
  ctx.strokeStyle = theme.border;
  ctx.lineWidth = borderOuter;
  ctx.strokeRect(borderOuter / 2, borderOuter / 2, w - borderOuter, h - borderOuter);

  // Inner accent border
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = borderInner;
  const innerX = borderOuter + gap + borderInner / 2;
  const innerY = borderOuter + gap + borderInner / 2;
  const innerW = w - (borderOuter + gap + borderInner / 2) * 2;
  const innerH = h - (borderOuter + gap + borderInner / 2) * 2;
  ctx.strokeRect(innerX, innerY, innerW, innerH);

  // Header strip background
  const headerX = inset;
  const headerY = inset;
  const headerW = w - inset * 2;
  ctx.fillStyle = theme.headerBg;
  ctx.fillRect(headerX, headerY, headerW, headerHeight);

  // Header text (card name)
  ctx.fillStyle = theme.headerText;
  ctx.font = "small-caps bold 32px Signika, Palatino Linotype, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(cardName, w / 2, headerY + headerHeight / 2);

  // Accent separator under header
  ctx.strokeStyle = theme.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(headerX, headerY + headerHeight);
  ctx.lineTo(headerX + headerW, headerY + headerHeight);
  ctx.stroke();

  // Corner ornaments (small diamonds at each corner of the inner border)
  const ornamentSize = 6;
  const corners = [
    [innerX, innerY],
    [innerX + innerW, innerY],
    [innerX, innerY + innerH],
    [innerX + innerW, innerY + innerH]
  ];
  ctx.fillStyle = theme.accent;
  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - ornamentSize);
    ctx.lineTo(cx + ornamentSize, cy);
    ctx.lineTo(cx, cy + ornamentSize);
    ctx.lineTo(cx - ornamentSize, cy);
    ctx.closePath();
    ctx.fill();
  }

  // Notes text
  const textX = inset + textPadding;
  const textY = headerY + headerHeight + textPadding + 14;

  ctx.fillStyle = theme.text;
  ctx.font = textFont;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  if (notesText) {
    _wrapText(ctx, notesText, textX, textY, textMaxWidth, lineHeight);
  } else {
    // Placeholder text
    ctx.fillStyle = theme.placeholder;
    ctx.font = "italic 24px Signika, Palatino Linotype, serif";
    ctx.fillText("Notes will appear here as you", textX, textY);
    ctx.fillText("flesh out this icon...", textX, textY + lineHeight);
  }

  // Convert to blob
  const blob = await new Promise(resolve => c.toBlob(resolve, "image/png"));
  return { blob, height: h };
}

/**
 * Render and upload a notes image, returning { path, height }.
 */
async function _uploadNotesImage(cardName, notesText) {
  await _ensureNotesFolder();
  const { blob, height } = await _renderNotesImage(cardName, notesText);
  const filename = `${cardName.replace(/[^a-zA-Z0-9]/g, "_")}.png`;
  const file = new File([blob], filename, { type: "image/png" });
  const response = await foundry.applications.apps.FilePicker.implementation.upload(
    "data", NOTES_FOLDER, file
  );
  return { path: response.path, height };
}

// ─── Utility ─────────────────────────────────────────────────────

/**
 * Find a deck by name (partial match, case-insensitive).
 */
function _findDeck(nameFragment) {
  return game.cards.find(c => c.type === "deck" && c.name.toLowerCase().includes(nameFragment.toLowerCase()));
}

/**
 * Find or auto-create the Fate's Table pile.
 */
async function _getFatesTable() {
  let table = game.cards.find(c => c.type === "pile" && c.name === "Fate's Table");
  if (!table) {
    table = await Cards.create({
      name: "Fate's Table",
      type: "pile",
      description: "The play area where Fate Herself reveals drawn cards."
    });
    ui.notifications.info("Created Fate's Table pile automatically.");
  }
  return table;
}

/**
 * Get the face image for a card.
 */
function _cardImg(card) {
  return card.faces?.[0]?.img || card.img || "";
}

/**
 * Post a card to chat with its image.
 */
async function _postCardToChat(card, extra = "") {
  const img = _cardImg(card);
  const name = card.name || "Unknown Card";

  const content = `
    <div style="text-align:center;">
      <h3 style="font-variant:small-caps; margin:0 0 6px;">${name}</h3>
      ${img ? `<img src="${img}" style="max-width:200px; border:1px solid #333; border-radius:4px;" />` : ""}
      ${extra ? `<p style="font-size:11px; color:#666; margin:4px 0 0;">${extra}</p>` : ""}
    </div>`;

  await ChatMessage.create({
    content,
    speaker: { alias: "Fate Herself" },
    whisper: []
  });
}

/**
 * Get the center of the current viewport in scene coordinates.
 */
function _viewportCenter() {
  return {
    x: canvas.stage.pivot.x,
    y: canvas.stage.pivot.y
  };
}

// ─── Arcana Actors ──────────────────────────────────────────────

/**
 * Create arcana actors by scanning card image filenames in the major folder.
 * Corebook descriptions are fuzzy-matched from major-arcana-data.mjs.
 * Skips actors that already exist. All get OBSERVER permission for players.
 */
export async function createArcanaActors() {
  const MAJOR_FOLDERS = [`${USER_DATA}/cards/major`, "systems/royal-blood/cards/major"];
  const exts = { extensions: [".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"] };
  let images;
  for (const folder of MAJOR_FOLDERS) {
    try {
      const result = await foundry.applications.apps.FilePicker.implementation.browse("data", folder, exts);
      const found = result.files.map(path => {
        const filename = decodeURIComponent(path.split("/").pop());
        const name = filename.replace(/\.[^.]+$/, "");
        return { name, path };
      });
      if (found.length > 0) { images = found; break; }
    } catch { /* try next folder */ }
  }
  if (!images) {
    console.warn("Royal Blood | Could not find major arcana images in any folder.");
    return;
  }

  if (images.length === 0) return;

  // Find or create the folder
  let folder = game.folders.find(f => f.name === "Major Arcana" && f.type === "Actor");
  if (!folder) {
    folder = await Folder.create({ name: "Major Arcana", type: "Actor" });
  }

  for (const { name, path: img } of images) {
    const arcana = findArcanaData(name);

    const existing = game.actors.find(a => a.type === "arcana" && a.name === name && a.folder?.id === folder.id);
    if (existing) {
      // Update if data or ownership has changed
      const updates = {};
      if (arcana) {
        const sys = existing.system;
        if (sys.subtitle !== arcana.subtitle || sys.description !== arcana.description ||
            sys.person !== arcana.person || sys.location !== arcana.location || sys.object !== arcana.object) {
          updates["system.subtitle"] = arcana.subtitle;
          updates["system.description"] = arcana.description;
          updates["system.person"] = arcana.person;
          updates["system.location"] = arcana.location;
          updates["system.object"] = arcana.object;
        }
      }
      if (existing.ownership.default !== CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER) {
        updates["ownership.default"] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
      }
      if (Object.keys(updates).length > 0) {
        await existing.update(updates);
      }
      continue;
    }

    await Actor.create({
      name,
      type: "arcana",
      img,
      folder: folder.id,
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
      system: {
        subtitle: arcana?.subtitle || "",
        description: arcana?.description || "",
        person: arcana?.person || "",
        location: arcana?.location || "",
        object: arcana?.object || "",
        notes: ""
      },
      prototypeToken: {
        name,
        texture: { src: img },
        width: 7,
        height: 12,
        disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
        actorLink: true,
        lockRotation: true,
        movementAction: "blink",
        displayName: CONST.TOKEN_DISPLAY_MODES.NONE,
        displayBars: CONST.TOKEN_DISPLAY_MODES.NONE
      }
    });
  }

  console.log("Royal Blood | Major Arcana actors ready.");
}

/**
 * Create arcana actors for all Minor Arcana cards (from card images).
 */
export async function createMinorArcanaActors() {
  const MINOR_FOLDERS = [`${USER_DATA}/cards/minor`, "systems/royal-blood/cards/minor"];
  const COURT_FOLDERS = [`${USER_DATA}/cards/court`, "systems/royal-blood/cards/court"];
  const exts = { extensions: [".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"] };

  let images = [];
  for (const folder of MINOR_FOLDERS) {
    try {
      const result = await foundry.applications.apps.FilePicker.implementation.browse("data", folder, exts);
      const found = result.files.map(path => {
        const filename = decodeURIComponent(path.split("/").pop());
        const name = filename.replace(/\.[^.]+$/, ""); // match deck builder naming
        return { name, path };
      });
      if (found.length > 0) { images = found; break; }
    } catch { /* try next folder */ }
  }

  // Also include court cards (unchosen ones get merged into the minor deck)
  for (const folder of COURT_FOLDERS) {
    try {
      const result = await foundry.applications.apps.FilePicker.implementation.browse("data", folder, exts);
      const found = result.files.map(path => {
        const filename = decodeURIComponent(path.split("/").pop());
        const name = filename.replace(/\.[^.]+$/, "");
        return { name, path };
      });
      if (found.length > 0) { images = images.concat(found); break; }
    } catch { /* try next folder */ }
  }

  if (images.length === 0) {
    console.warn("Royal Blood | Could not find minor arcana images in any folder.");
    return;
  }

  let folder = game.folders.find(f => f.name === "Minor Arcana" && f.type === "Actor");
  if (!folder) {
    folder = await Folder.create({ name: "Minor Arcana", type: "Actor" });
  }

  for (const { name, path: img } of images) {
    const existing = game.actors.find(a => a.type === "minor" && a.name === name && a.folder?.id === folder.id);
    if (existing) {
      if (existing.ownership.default !== CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER) {
        await existing.update({ "ownership.default": CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER });
      }
      continue;
    }

    await Actor.create({
      name,
      type: "minor",
      img,
      folder: folder.id,
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER },
      system: {
        flipped: false,
        notes: ""
      },
      prototypeToken: {
        name,
        texture: { src: img },
        width: 7,
        height: 12,
        disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
        actorLink: true,
        lockRotation: true,
        movementAction: "blink",
        displayName: CONST.TOKEN_DISPLAY_MODES.NONE,
        displayBars: CONST.TOKEN_DISPLAY_MODES.NONE
      }
    });
  }

  console.log("Royal Blood | Minor Arcana actors ready.");
}

/**
 * Find the arcana or minor actor matching a drawn card (by name).
 */
function _findArcanaActor(card) {
  return game.actors.find(a => (a.type === "arcana" || a.type === "minor") && a.name === card.name);
}

/**
 * Place an arcana token on the map for a drawn spread card.
 */
async function _placeArcanaToken(card, x, y) {
  const actor = _findArcanaActor(card);
  if (!actor) return null;

  const img = _cardImg(card) || actor.prototypeToken.texture.src;
  const gridSize = canvas.dimensions.size;

  const tokenData = {
    name: actor.name,
    actorId: actor.id,
    texture: { src: img },
    width: CARD_TILE_WIDTH / gridSize,
    height: CARD_TILE_HEIGHT / gridSize,
    x,
    y,
    disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
    displayName: CONST.TOKEN_DISPLAY_MODES.NONE,
    displayBars: CONST.TOKEN_DISPLAY_MODES.NONE,
    actorLink: true,
    lockRotation: true,
    movementAction: "blink",
    flags: {
      "royal-blood": {
        isCard: true,
        category: "spread",
        cardName: card.name,
        cardId: card.id
      }
    }
  };

  const [token] = await canvas.scene.createEmbeddedDocuments("Token", [tokenData]);
  return token;
}

/**
 * Place a styled notes tile next to a token for on-map notes.
 * Linked to the actor via flags so notes sync automatically.
 */
async function _placeNotesTile(actorId, cardName, x, y, notesText) {
  const { path: imagePath, height } = await _uploadNotesImage(cardName, notesText);

  const [tile] = await canvas.scene.createEmbeddedDocuments("Tile", [{
    texture: { src: imagePath + "?t=" + Date.now() },
    x: x + CARD_TILE_WIDTH + NOTE_SPACING,
    y,
    width: NOTE_WIDTH,
    height,
    flags: {
      "royal-blood": {
        isCardNote: true,
        category: "spread",
        actorId,
        cardName
      }
    }
  }]);
  return tile;
}

// ─── Major Arcana: The Spread ───────────────────────────────────

/**
 * Draw a Major Arcana card and place it on the map as part of the spread.
 */
export async function drawToSpread() {
  const deck = _findDeck("major");
  if (!deck) {
    ui.notifications.warn("No Major Arcana deck found. Create one from the preset first.");
    return;
  }

  const available = deck.availableCards;
  if (available.length === 0) {
    ui.notifications.warn("Major Arcana deck is empty. Shuffle to reset.");
    return;
  }

  const table = await _getFatesTable();
  await deck.deal([table], 1, { how: CONST.CARD_DRAW_MODES.TOP });

  const card = table.cards.contents[table.cards.contents.length - 1];
  if (!card) return;

  const actor = _findArcanaActor(card);
  const center = _viewportCenter();
  const tokenX = center.x - CARD_TILE_WIDTH / 2;
  const tokenY = center.y - CARD_TILE_HEIGHT / 2;

  await _placeArcanaToken(card, tokenX, tokenY);
  if (actor) {
    await _placeNotesTile(actor.id, actor.name, tokenX, tokenY, actor.system.notes || "");
  }
  await _postCardToChat(card, "Added to the spread");
}

// ─── Minor Arcana: Resolve ──────────────────────────────────────

/**
 * Place a minor arcana token face-down on the scene.
 */
async function _placeMinorToken(card, x, y) {
  const actor = _findArcanaActor(card);
  if (!actor) return null;

  const backImg = await _getCardBackImg();
  if (!backImg) {
    ui.notifications.warn("No card back image found in cards/backs/ folder.");
    return null;
  }

  const frontImg = _cardImg(card) || actor.prototypeToken.texture.src;
  await actor.update({
    "system.flipped": true,
    "flags.royal-blood.frontImg": frontImg
  });

  const gridSize = canvas.dimensions.size;
  const [token] = await canvas.scene.createEmbeddedDocuments("Token", [{
    name: actor.name,
    actorId: actor.id,
    texture: { src: backImg },
    width: CARD_TILE_WIDTH / gridSize,
    height: CARD_TILE_HEIGHT / gridSize,
    x,
    y,
    disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
    displayName: CONST.TOKEN_DISPLAY_MODES.NONE,
    displayBars: CONST.TOKEN_DISPLAY_MODES.NONE,
    actorLink: true,
    lockRotation: true,
    movementAction: "blink",
    flags: {
      "royal-blood": {
        isCard: true,
        category: "minor",
        cardName: card.name,
        cardId: card.id
      }
    }
  }]);
  return token;
}

/**
 * Draw a Minor Arcana card to resolve an action.
 */
export async function drawToResolve() {
  const deck = _findDeck("minor");
  if (!deck) {
    ui.notifications.warn("No Minor Arcana deck found. Create one from the preset first.");
    return;
  }

  const available = deck.availableCards;
  if (available.length === 0) {
    ui.notifications.warn("Minor Arcana deck is empty. Shuffle to reset.");
    return;
  }

  const table = await _getFatesTable();
  await deck.deal([table], 1, { how: CONST.CARD_DRAW_MODES.TOP });

  const card = table.cards.contents[table.cards.contents.length - 1];
  if (!card) return;

  const center = _viewportCenter();
  const tokenX = center.x - CARD_TILE_WIDTH / 2;
  const tokenY = center.y - CARD_TILE_HEIGHT / 2;

  await _placeMinorToken(card, tokenX, tokenY);
}

/**
 * Draw 3 Minor Arcana cards — "Make things interesting".
 */
export async function drawMultiple(count = 3) {
  const deck = _findDeck("minor");
  if (!deck) {
    ui.notifications.warn("No Minor Arcana deck found. Create one from the preset first.");
    return;
  }

  const available = deck.availableCards;
  if (available.length < count) {
    ui.notifications.warn(`Minor Arcana only has ${available.length} cards left. Shuffle to reset.`);
    return;
  }

  const table = await _getFatesTable();
  const beforeCount = table.cards.size;

  for (let i = 0; i < count; i++) {
    await deck.deal([table], 1, { how: CONST.CARD_DRAW_MODES.TOP });
  }

  const newCards = table.cards.contents.slice(beforeCount);

  // Place tokens face-down on the scene, spaced horizontally
  const center = _viewportCenter();
  const totalWidth = count * CARD_TILE_WIDTH + (count - 1) * NOTE_SPACING;
  const startX = center.x - totalWidth / 2;
  const tokenY = center.y - CARD_TILE_HEIGHT / 2;

  for (let i = 0; i < newCards.length; i++) {
    const tokenX = startX + i * (CARD_TILE_WIDTH + NOTE_SPACING);
    await _placeMinorToken(newCards[i], tokenX, tokenY);
  }

}

// ─── Trick-Taking Endgame ──────────────────────────────────────

/**
 * Find or create a card hand for the given user.
 */
async function _getOrCreatePlayerHand(user) {
  const handName = `${user.name}'s Hand`;
  let hand = game.cards.find(c => c.type === "hand" && c.name === handName);
  if (hand) return hand;

  hand = await Cards.create({
    name: handName,
    type: "hand",
    ownership: {
      default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
      [user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
    }
  });
  ui.notifications.info(game.i18n.format("ROYALBLOOD.HandCreated", { name: user.name }));
  return hand;
}

/**
 * Place a trick card token face-down on the scene.
 */
async function _placeTrickToken(card, hand, userId) {
  const actor = _findArcanaActor(card);
  if (!actor) return null;

  const backImg = await _getCardBackImg();
  if (!backImg) {
    ui.notifications.warn("No card back image found in cards/backs/ folder.");
    return null;
  }

  const frontImg = _cardImg(card) || actor.prototypeToken.texture.src;
  await actor.update({
    "system.flipped": true,
    "flags.royal-blood.frontImg": frontImg
  });

  // Pass card from hand to Fate's Table so deck.recall() can recover it
  const table = await _getFatesTable();
  await hand.pass(table, [card.id]);

  // Offset based on how many trick tokens are already on the scene
  const existingTricks = canvas.scene.tokens.filter(t => t.flags?.["royal-blood"]?.category === "trick");
  const offset = existingTricks.length * (CARD_TILE_WIDTH + NOTE_SPACING);

  const center = _viewportCenter();
  const gridSize = canvas.dimensions.size;
  const tokenX = center.x - CARD_TILE_WIDTH / 2 + offset;
  const tokenY = center.y - CARD_TILE_HEIGHT / 2;

  const [token] = await canvas.scene.createEmbeddedDocuments("Token", [{
    name: actor.name,
    actorId: actor.id,
    texture: { src: backImg },
    width: CARD_TILE_WIDTH / gridSize,
    height: CARD_TILE_HEIGHT / gridSize,
    x: tokenX,
    y: tokenY,
    disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
    displayName: CONST.TOKEN_DISPLAY_MODES.NONE,
    displayBars: CONST.TOKEN_DISPLAY_MODES.NONE,
    actorLink: true,
    lockRotation: true,
    movementAction: "blink",
    flags: {
      "royal-blood": {
        isCard: true,
        category: "trick",
        cardName: card.name,
        cardId: card.id,
        playedBy: userId
      }
    }
  }]);

  await ChatMessage.create({
    content: `<p style="text-align:center; font-variant:small-caps;">${game.i18n.format("ROYALBLOOD.CardPlayed", { name: game.users.get(userId)?.name || "Unknown" })}</p>`,
    speaker: { alias: "Fate Herself" },
    whisper: []
  });

  return token;
}

/**
 * GM macro: deal cards from the Minor Arcana deck to a player's hand.
 */
export async function dealToHand() {
  if (!game.user.isGM) {
    ui.notifications.warn("Only the GM can deal cards.");
    return;
  }

  const deck = _findDeck("minor");
  if (!deck) {
    ui.notifications.warn("No Minor Arcana deck found.");
    return;
  }

  const players = game.users.filter(u => !u.isGM && u.active);
  if (players.length === 0) {
    ui.notifications.warn("No active players found.");
    return;
  }

  const playerOptions = players.map(p => `<option value="${p.id}">${p.name}</option>`).join("");

  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize("ROYALBLOOD.CardsDealt").split(" ")[0] || "Deal to Hand" },
    position: { width: 350 },
    content: `
      <div style="margin-bottom:10px;">
        <div class="form-group" style="margin-bottom:8px;">
          <label>${game.i18n.localize("ROYALBLOOD.TrickPlayer")}</label>
          <select name="deal-target">${playerOptions}</select>
        </div>
        <div class="form-group">
          <label>${game.i18n.localize("ROYALBLOOD.TrickCount")}</label>
          <input type="number" name="deal-count" value="5" min="1" max="20" />
        </div>
      </div>`,
    ok: {
      label: "Deal",
      callback: (event, button) => {
        const container = button.closest("dialog, form, .application");
        const playerId = container?.querySelector("select[name='deal-target']")?.value;
        const count = parseInt(container?.querySelector("input[name='deal-count']")?.value) || 1;
        return playerId ? { playerId, count } : null;
      }
    }
  });

  if (!result) return;

  const { playerId, count } = result;
  const user = game.users.get(playerId);
  if (!user) return;

  const available = deck.availableCards.length;
  if (available < count) {
    ui.notifications.warn(`Only ${available} cards left in the Minor Arcana deck.`);
    return;
  }

  const hand = await _getOrCreatePlayerHand(user);
  await deck.deal([hand], count, { how: CONST.CARD_DRAW_MODES.TOP });

  await ChatMessage.create({
    content: `<p style="text-align:center; font-variant:small-caps;">${game.i18n.format("ROYALBLOOD.CardsDealt", { count, name: user.name })}</p>`,
    speaker: { alias: "Fate Herself" },
    whisper: [game.user.id]
  });
  ui.notifications.info(game.i18n.format("ROYALBLOOD.CardsDealt", { count, name: user.name }));
}

/**
 * Player macro: pick a card from your hand and play it face-down on the scene.
 */
export async function playCard() {
  // Find the current user's hand
  const hand = game.cards.find(c =>
    c.type === "hand" && c.ownership[game.user.id] === CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
  );
  if (!hand || hand.cards.size === 0) {
    ui.notifications.warn(game.i18n.localize("ROYALBLOOD.NoCardsInHand"));
    return;
  }

  const cardGrid = hand.cards.contents.map(card => {
    const img = _cardImg(card);
    return `
      <div class="rb-hand-card" data-card-id="${card.id}"
           style="cursor:pointer; border:3px solid transparent; border-radius:6px; padding:4px; text-align:center;">
        ${img ? `<img src="${img}" style="width:100px; border-radius:4px;" />` : `<div style="width:100px; height:150px; background:#333; border-radius:4px;"></div>`}
        <p style="font-size:11px; margin:4px 0 0; font-variant:small-caps;">${card.name}</p>
      </div>`;
  }).join("");

  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: game.i18n.localize("ROYALBLOOD.SelectCard") },
    position: { width: 500 },
    content: `
      <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:8px; margin-bottom:8px;">
        ${cardGrid}
      </div>
      <input type="hidden" name="selected-card" value="" />`,
    ok: {
      label: game.i18n.localize("ROYALBLOOD.SelectCard"),
      callback: (event, button) => {
        const container = button.closest("dialog, form, .application");
        return container?.querySelector("input[name='selected-card']")?.value || null;
      }
    },
    render: (event, app) => {
      const el = app.element;
      el.querySelectorAll(".rb-hand-card").forEach(div => {
        div.addEventListener("click", () => {
          el.querySelectorAll(".rb-hand-card").forEach(d => d.style.borderColor = "transparent");
          div.style.borderColor = "#c9a945";
          el.querySelector("input[name='selected-card']").value = div.dataset.cardId;
        });
      });
    }
  });

  if (!result) return;

  const card = hand.cards.get(result);
  if (!card) return;

  if (game.user.isGM) {
    await _placeTrickToken(card, hand, game.user.id);
  } else {
    game.socket.emit("system.royal-blood", {
      action: "playTrickCard",
      cardId: card.id,
      handId: hand.id,
      userId: game.user.id
    });
  }
}

/**
 * GM macro: reveal all face-down trick tokens simultaneously.
 */
export async function revealTrick() {
  if (!game.user.isGM) {
    ui.notifications.warn("Only the GM can reveal the trick.");
    return;
  }

  if (!canvas.scene) return;

  const trickTokens = canvas.scene.tokens.filter(t => t.flags?.["royal-blood"]?.category === "trick");
  if (trickTokens.length === 0) {
    ui.notifications.warn("No trick cards on the table.");
    return;
  }

  // Collect reveal data before deleting tokens
  const reveals = [];
  for (const tokenDoc of trickTokens) {
    const actor = tokenDoc.actor ?? game.actors.get(tokenDoc.actorId);
    if (!actor) continue;
    const frontImg = actor.flags?.["royal-blood"]?.frontImg || actor.img;
    reveals.push({
      actor,
      frontImg,
      x: tokenDoc.x,
      y: tokenDoc.y,
      width: tokenDoc.width,
      height: tokenDoc.height,
      flags: tokenDoc.flags,
      playedBy: tokenDoc.flags?.["royal-blood"]?.playedBy
    });
  }

  // Batch delete all face-down trick tokens
  await canvas.scene.deleteEmbeddedDocuments("Token", trickTokens.map(t => t.id));

  // Update all actors to unflipped
  for (const { actor } of reveals) {
    if (actor.system.flipped) {
      await actor.update({ "system.flipped": false });
    }
  }

  // Batch create all face-up tokens
  const newTokenData = reveals.map(({ actor, frontImg, x, y, width, height, flags }) => ({
    name: actor.name,
    actorId: actor.id,
    texture: { src: frontImg },
    width,
    height,
    x,
    y,
    disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
    displayName: CONST.TOKEN_DISPLAY_MODES.NONE,
    displayBars: CONST.TOKEN_DISPLAY_MODES.NONE,
    actorLink: true,
    lockRotation: true,
    movementAction: "blink",
    flags
  }));

  await canvas.scene.createEmbeddedDocuments("Token", newTokenData);

  // Post all revealed cards to chat
  const cardRows = reveals.map(({ actor, frontImg, playedBy }) => {
    const playerName = game.users.get(playedBy)?.name || "";
    return `
      <div style="display:inline-block; text-align:center; margin:4px;">
        ${frontImg ? `<img src="${frontImg}" style="max-width:120px; border:1px solid #333; border-radius:4px;" />` : ""}
        <p style="font-size:11px; margin:4px 0 0; font-variant:small-caps;">${actor.name}</p>
        ${playerName ? `<p style="font-size:10px; color:#666; margin:0;">${playerName}</p>` : ""}
      </div>`;
  }).join("");

  await ChatMessage.create({
    content: `
      <div style="text-align:center;">
        <h3 style="font-variant:small-caps; margin:0 0 8px;">${game.i18n.localize("ROYALBLOOD.TrickRevealed")}</h3>
        <div style="display:flex; flex-wrap:wrap; justify-content:center;">${cardRows}</div>
      </div>`,
    speaker: { alias: "Fate Herself" },
    whisper: []
  });
}

// ─── Cleanup ────────────────────────────────────────────────────

/**
 * Shuffle the Major Arcana back together and clear spread tokens.
 */
export async function shuffleMajor() {
  const deck = _findDeck("major");
  if (!deck) {
    ui.notifications.warn("No Major Arcana deck found.");
    return;
  }

  // Clear spread tokens, note tiles, and legacy drawings
  if (canvas.scene) {
    const tokens = canvas.scene.tokens.filter(t => t.flags?.["royal-blood"]?.category === "spread");
    if (tokens.length > 0) {
      await canvas.scene.deleteEmbeddedDocuments("Token", tokens.map(t => t.id));
    }
    const tiles = canvas.scene.tiles.filter(t => t.flags?.["royal-blood"]?.category === "spread");
    if (tiles.length > 0) {
      await canvas.scene.deleteEmbeddedDocuments("Tile", tiles.map(t => t.id));
    }
    const drawings = canvas.scene.drawings.filter(d => d.flags?.["royal-blood"]?.category === "spread");
    if (drawings.length > 0) {
      await canvas.scene.deleteEmbeddedDocuments("Drawing", drawings.map(d => d.id));
    }
  }

  // Clear notes and flipped state on all arcana and minor actors
  const arcanaActors = game.actors.filter(a =>
    (a.type === "arcana" || a.type === "minor") && (a.system.notes || a.system.flipped)
  );
  for (const actor of arcanaActors) {
    await actor.update({ "system.notes": "", "system.flipped": false });
  }

  await deck.recall();
  await deck.shuffle();

  // Re-deal cards that were claimed as twists so they stay out of the deck
  const claimedNames = deck.getFlag("royal-blood", "claimedCardNames") || [];
  if (claimedNames.length > 0) {
    const table = await _getFatesTable();
    for (const name of claimedNames) {
      const card = deck.cards.find(c => c.name === name);
      if (card) await deck.pass(table, [card.id]);
    }
  }

  await ChatMessage.create({
    content: `<p style="text-align:center; font-variant:small-caps;"><strong>Major Arcana</strong> — shuffled and reset.</p>`,
    speaker: { alias: "Fate Herself" },
    whisper: []
  });
  ui.notifications.info("Major Arcana shuffled and all cards returned.");
}

/**
 * Shuffle the Minor Arcana back together and clear resolved tiles.
 */
export async function shuffleMinor() {
  const deck = _findDeck("minor");
  if (!deck) {
    ui.notifications.warn("No Minor Arcana deck found.");
    return;
  }

  // Clear minor arcana tokens from the scene
  if (canvas.scene) {
    const minorTokens = canvas.scene.tokens.filter(t => {
      const cat = t.flags?.["royal-blood"]?.category;
      return cat === "minor" || cat === "trick";
    });
    if (minorTokens.length > 0) {
      await canvas.scene.deleteEmbeddedDocuments("Token", minorTokens.map(t => t.id));
    }
  }

  // Reset flipped state on all minor actors
  const minorActors = game.actors.filter(a => a.type === "minor" && a.system.flipped);
  for (const actor of minorActors) {
    await actor.update({ "system.flipped": false });
  }

  await deck.recall();
  await deck.shuffle();

  await ChatMessage.create({
    content: `<p style="text-align:center; font-variant:small-caps;"><strong>Minor Arcana</strong> — shuffled and reset.</p>`,
    speaker: { alias: "Fate Herself" },
    whisper: []
  });
  ui.notifications.info("Minor Arcana shuffled and all cards returned.");
}

/**
 * Merge unchosen court cards into the Minor Arcana deck.
 * Skips any court card whose name matches a character actor's rank (i.e. chosen cards).
 */
export async function mergeCourtCards() {
  const courtDeck = _findDeck("court");
  const minorDeck = _findDeck("minor");
  if (!courtDeck) {
    ui.notifications.warn("No Court Cards deck found.");
    return;
  }
  if (!minorDeck) {
    ui.notifications.warn("No Minor Arcana deck found.");
    return;
  }

  // Find court card names that are assigned to characters
  const chosenNames = new Set(
    game.actors.filter(a => a.type === "character" && a.system.rank)
      .map(a => a.system.rank)
  );

  let merged = 0;
  for (const card of courtDeck.availableCards) {
    if (chosenNames.has(card.name)) continue;
    const alreadyInMinor = minorDeck.cards.some(c => c.name === card.name);
    if (alreadyInMinor) continue;
    try {
      await courtDeck.pass(minorDeck, [card.id]);
      merged++;
    } catch (e) {
      console.warn(`Royal Blood | Could not pass card ${card.name} to minor deck:`, e);
    }
  }

  await minorDeck.shuffle();

  await ChatMessage.create({
    content: `<p style="text-align:center; font-variant:small-caps;"><strong>${merged} court card(s)</strong> merged into the Minor Arcana deck.</p>`,
    speaker: { alias: "Fate Herself" },
    whisper: []
  });
  ui.notifications.info(`${merged} court card(s) merged into Minor Arcana.`);
}

/**
 * Reset everything — clear all card tiles, recall both decks, shuffle.
 */
export async function resetAll() {
  if (canvas.scene) {
    // Clear spread and minor tokens, note tiles, and legacy drawings
    const tokens = canvas.scene.tokens.filter(t => {
      const cat = t.flags?.["royal-blood"]?.category;
      return cat === "spread" || cat === "minor" || cat === "trick";
    });
    if (tokens.length > 0) {
      await canvas.scene.deleteEmbeddedDocuments("Token", tokens.map(t => t.id));
    }
    const tiles = canvas.scene.tiles.filter(t =>
      t.flags?.["royal-blood"]?.isCard || t.flags?.["royal-blood"]?.isCardNote
    );
    if (tiles.length > 0) {
      await canvas.scene.deleteEmbeddedDocuments("Tile", tiles.map(t => t.id));
    }
    const drawings = canvas.scene.drawings.filter(d => d.flags?.["royal-blood"]?.category === "spread");
    if (drawings.length > 0) {
      await canvas.scene.deleteEmbeddedDocuments("Drawing", drawings.map(d => d.id));
    }
  }

  // Clear notes and flipped state on all arcana and minor actors
  const arcanaActors = game.actors.filter(a =>
    (a.type === "arcana" || a.type === "minor") && (a.system.notes || a.system.flipped)
  );
  for (const actor of arcanaActors) {
    await actor.update({ "system.notes": "", "system.flipped": false });
  }

  // Reset all character sheets
  const characters = game.actors.filter(a => a.type === "character");
  for (const char of characters) {
    // Delete all embedded twist items
    const twistIds = char.items.filter(i => i.type === "twist").map(i => i.id);
    if (twistIds.length > 0) {
      await char.deleteEmbeddedDocuments("Item", twistIds);
    }
    // Reset all character fields to defaults
    await char.update({
      "system.description": "",
      "system.royalLeft": { name: "", question: "", answer: "" },
      "system.royalRight": { name: "", question: "", answer: "" },
      "system.facet1": { name: "", lead: false, silver: false, marked: false, lost: false, description: "" },
      "system.facet2": { name: "", lead: false, silver: false, marked: false, lost: false, description: "" },
      "system.facet3": { name: "", lead: false, silver: false, marked: false, lost: false, description: "" },
      "system.coins": 0,
      "system.secrets": "",
      "system.notes": ""
    });
  }

  // Remove court cards that were passed into the minor deck
  const minorDeck = _findDeck("minor");
  const courtDeck = _findDeck("court");
  if (minorDeck && courtDeck) {
    const courtNames = new Set(courtDeck.cards.map(c => c.name));
    const courtInMinor = minorDeck.cards.filter(c => courtNames.has(c.name));
    if (courtInMinor.length > 0) {
      await minorDeck.deleteEmbeddedDocuments("Card", courtInMinor.map(c => c.id));
    }
  }

  // Delete all player hand card documents
  const hands = game.cards.filter(c => c.type === "hand");
  for (const hand of hands) {
    await hand.delete();
  }

  for (const name of ["court", "major", "minor"]) {
    const deck = _findDeck(name);
    if (deck) {
      if (name === "major") {
        await deck.unsetFlag("royal-blood", "claimedCardIds");
        await deck.unsetFlag("royal-blood", "claimedCardNames");
      }
      await deck.recall();
      await deck.shuffle();
    }
  }

  await ChatMessage.create({
    content: `<p style="text-align:center; font-variant:small-caps;">All cards recalled and shuffled. The table is clear.</p>`,
    speaker: { alias: "Fate Herself" },
    whisper: []
  });
  ui.notifications.info("All decks reset, map cleared.");
}

// ─── Initial Twist ──────────────────────────────────────────────

/**
 * Draw a Major Arcana card from the deck and assign it as a Twist
 * to a player character. The card is kept out of the deck (survives shuffles).
 */
export async function dealInitialTwist() {
  const deck = _findDeck("major");
  if (!deck) {
    ui.notifications.warn("No Major Arcana deck found.");
    return;
  }

  const available = deck.availableCards;
  if (available.length === 0) {
    ui.notifications.warn("Major Arcana deck is empty.");
    return;
  }

  const characters = game.actors.filter(a => a.type === "character");
  if (characters.length === 0) {
    ui.notifications.warn("No player characters found.");
    return;
  }

  // Draw a card
  const table = await _getFatesTable();
  await deck.deal([table], 1, { how: CONST.CARD_DRAW_MODES.TOP });
  const card = table.cards.contents[table.cards.contents.length - 1];
  if (!card) return;

  const img = _cardImg(card);
  const charOptions = characters.map(c => `<option value="${c.id}">${c.name}</option>`).join("");

  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: "Initial Twist" },
    position: { width: 400 },
    content: `
      <div style="text-align:center; margin-bottom:10px;">
        <h3 style="font-variant:small-caps; margin:0 0 8px;">Fate draws ${card.name}</h3>
        ${img ? `<img src="${img}" style="max-width:180px; border:1px solid #333; border-radius:4px; margin-bottom:8px;" />` : ""}
        <div class="form-group">
          <label>Assign to</label>
          <select name="twist-target">${charOptions}</select>
        </div>
      </div>`,
    ok: {
      label: "Assign as Twist",
      callback: (event, button) => {
        const select = button.closest("dialog, form, .application")?.querySelector("select[name='twist-target']");
        return select?.value ?? null;
      }
    }
  });

  if (!result) return;
  const character = game.actors.get(result);
  if (!character) return;

  // Create the twist
  await character.createEmbeddedDocuments("Item", [{
    name: card.name,
    type: "twist"
  }]);

  // Track claimed card name on the deck so it survives shuffles
  const claimed = deck.getFlag("royal-blood", "claimedCardNames") || [];
  if (!claimed.includes(card.name)) claimed.push(card.name);
  await deck.setFlag("royal-blood", "claimedCardNames", claimed);

  await ChatMessage.create({
    content: `
      <div style="text-align:center;">
        <h3 style="font-variant:small-caps; margin:0 0 6px;">Initial Twist</h3>
        ${img ? `<img src="${img}" style="max-width:160px; border:1px solid #333; border-radius:4px;" />` : ""}
        <p style="margin:6px 0 0;"><strong>${character.name}</strong> receives <strong>${card.name}</strong> as a Twist.</p>
      </div>`,
    speaker: { alias: "Fate Herself" },
    whisper: []
  });

  ui.notifications.info(`${card.name} assigned as a Twist to ${character.name}.`);
}

// ─── Flip Icon ──────────────────────────────────────────────────

/**
 * Flip a Major Arcana icon face-down (defeated) or face-up.
 * Toggles the token image between card front and card back,
 * and hides/shows the notes tile.
 * @param {Token|null} token — the token to flip, or null to use the selected token
 */
export async function flipIcon(token = null) {
  if (!token) {
    const controlled = canvas.tokens.controlled;
    if (controlled.length !== 1) {
      ui.notifications.warn("Select a single Major Arcana token to flip.");
      return;
    }
    token = controlled[0];
  }

  const tokenDoc = token.document ?? token;
  const actor = tokenDoc.actor ?? game.actors.get(tokenDoc.actorId);
  if (!actor || (actor.type !== "arcana" && actor.type !== "minor")) {
    ui.notifications.warn("Selected token is not an Arcana icon.");
    return;
  }

  const isFlipped = actor.system.flipped;

  // Find the linked notes tile
  const tile = canvas.scene?.tiles.find(
    t => t.flags?.["royal-blood"]?.actorId === actor.id
  );

  if (!isFlipped) {
    // Flip face-down: replace token with back image
    const backImg = await _getCardBackImg();
    if (!backImg) {
      ui.notifications.warn("No card back image found in cards/backs/ folder.");
      return;
    }
    if (tile) await tile.update({ alpha: 0 });
    const frontImg = tokenDoc.texture.src;
    await actor.update({
      "system.flipped": true,
      "flags.royal-blood.frontImg": frontImg
    });
    // Delete old token and create new one with back image in same spot
    const tokenState = { x: tokenDoc.x, y: tokenDoc.y, width: tokenDoc.width, height: tokenDoc.height };
    await canvas.scene.deleteEmbeddedDocuments("Token", [tokenDoc.id]);
    const [newToken] = await canvas.scene.createEmbeddedDocuments("Token", [{
      name: actor.name,
      actorId: actor.id,
      texture: { src: backImg },
      ...tokenState,
      disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
      displayName: CONST.TOKEN_DISPLAY_MODES.NONE,
      displayBars: CONST.TOKEN_DISPLAY_MODES.NONE,
      actorLink: true,
      lockRotation: true,
      movementAction: "blink",
      flags: tokenDoc.flags
    }]);
    newToken?.object?.control();
  } else {
    // Flip face-up: replace token with front image
    const frontImg = actor.flags?.["royal-blood"]?.frontImg || actor.img;
    await actor.update({ "system.flipped": false });
    const tokenState = { x: tokenDoc.x, y: tokenDoc.y, width: tokenDoc.width, height: tokenDoc.height };
    await canvas.scene.deleteEmbeddedDocuments("Token", [tokenDoc.id]);
    const [newToken] = await canvas.scene.createEmbeddedDocuments("Token", [{
      name: actor.name,
      actorId: actor.id,
      texture: { src: frontImg },
      ...tokenState,
      disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
      displayName: CONST.TOKEN_DISPLAY_MODES.NONE,
      displayBars: CONST.TOKEN_DISPLAY_MODES.NONE,
      actorLink: true,
      lockRotation: true,
      movementAction: "blink",
      flags: tokenDoc.flags
    }]);
    newToken?.object?.control();
    if (tile) await tile.update({ alpha: 1 });
  }

  if (actor.type === "minor") {
    // Only post to chat when revealing a minor card
    if (isFlipped) {
      const revealImg = actor.flags?.["royal-blood"]?.frontImg || actor.img;
      await ChatMessage.create({
        content: `
          <div style="text-align:center;">
            ${revealImg ? `<img src="${revealImg}" style="max-width:200px; border:1px solid #333; border-radius:4px;" />` : ""}
            <p style="font-variant:small-caps; margin:4px 0 0;"><strong>${actor.name}</strong> — revealed.</p>
          </div>`,
        speaker: { alias: "Fate Herself" },
        whisper: []
      });
    }
  } else {
    const state = isFlipped ? "revealed" : "defeated";
    await ChatMessage.create({
      content: `<p style="text-align:center; font-variant:small-caps;"><strong>${actor.name}</strong> — ${state}.</p>`,
      speaker: { alias: "Fate Herself" },
      whisper: []
    });
  }
}

/**
 * Claim a defeated Icon as a Twist on a player's character sheet.
 * GM selects a defeated arcana token, then picks which character receives it.
 */
export async function claimIcon() {
  const controlled = canvas.tokens.controlled;
  if (controlled.length !== 1) {
    ui.notifications.warn("Select a single defeated Major Arcana token to claim.");
    return;
  }

  const tokenDoc = controlled[0].document ?? controlled[0];
  const actor = tokenDoc.actor ?? game.actors.get(tokenDoc.actorId);
  if (!actor || actor.type !== "arcana") {
    ui.notifications.warn("Selected token is not a Major Arcana icon.");
    return;
  }
  if (!actor.system.flipped) {
    ui.notifications.warn(`${actor.name} has not been defeated yet.`);
    return;
  }

  // Get all player characters
  const characters = game.actors.filter(a => a.type === "character");
  if (characters.length === 0) {
    ui.notifications.warn("No player characters found.");
    return;
  }

  const options = characters.map(c => `<option value="${c.id}">${c.name}</option>`).join("");

  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: `Claim ${actor.name}` },
    position: { width: 350 },
    content: `
      <div style="margin-bottom:10px;">
        <p><strong>${actor.name}</strong> has been defeated. Choose a character to claim it as a Twist.</p>
        <div class="form-group">
          <label>Character</label>
          <select name="claim-target">${options}</select>
        </div>
      </div>`,
    ok: {
      label: "Claim as Twist",
      callback: (event, button) => {
        const select = button.closest("dialog, form, .application")?.querySelector("select[name='claim-target']");
        return select?.value ?? null;
      }
    }
  });

  if (!result) return;
  const character = game.actors.get(result);
  if (!character) return;

  await character.createEmbeddedDocuments("Item", [{
    name: actor.name,
    type: "twist"
  }]);

  // Track claimed card on the deck so it survives shuffles
  const deck = _findDeck("major");
  if (deck) {
    const table = await _getFatesTable();
    const card = table.cards.find(c => c.name.toLowerCase().includes(actor.name.toLowerCase()));
    if (card) {
      const claimed = deck.getFlag("royal-blood", "claimedCardNames") || [];
      if (!claimed.includes(card.name)) claimed.push(card.name);
      await deck.setFlag("royal-blood", "claimedCardNames", claimed);
    }
  }

  // Remove the token and its notes tile from the scene
  if (canvas.scene) {
    const tile = canvas.scene.tiles.find(
      t => t.flags?.["royal-blood"]?.actorId === actor.id
    );
    const toDelete = [tokenDoc.id];
    if (tile) toDelete.push(tile.id);
    await canvas.scene.deleteEmbeddedDocuments("Token", [tokenDoc.id]);
    if (tile) await canvas.scene.deleteEmbeddedDocuments("Tile", [tile.id]);
  }

  await ChatMessage.create({
    content: `<p style="text-align:center; font-variant:small-caps;"><strong>${character.name}</strong> claims <strong>${actor.name}</strong> as a Twist.</p>`,
    speaker: { alias: "Fate Herself" },
    whisper: []
  });

  ui.notifications.info(`${actor.name} added as a Twist to ${character.name}.`);
}

// ─── Character Selection ────────────────────────────────────────

/**
 * GM macro: assign court cards to players.
 * Shows a dropdown per player; selecting a card removes it from other dropdowns.
 * Chosen cards are removed from play. Unchosen court cards merge into the Minor Arcana deck.
 */
export async function chooseCharacters() {
  const courtDeck = game.cards.find(c => c.type === "deck" && c.name.toLowerCase().includes("court"));
  if (!courtDeck) {
    ui.notifications.warn("No Court Cards deck found. Create one from the preset first.");
    return;
  }

  const minorDeck = _findDeck("minor");
  if (!minorDeck) {
    ui.notifications.warn("No Minor Arcana deck found. Create one from the preset first.");
    return;
  }

  const courtCards = courtDeck.availableCards;
  if (courtCards.length === 0) {
    ui.notifications.warn("No court cards available. Reset All to restore them.");
    return;
  }

  // Get all players (non-GM)
  const players = game.users.filter(u => !u.isGM && u.active);
  if (players.length === 0) {
    ui.notifications.warn("No active players connected.");
    return;
  }

  // Build per-player rows
  const optionsHtml = courtCards.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
  const playerRows = players.map(p => `
    <div class="form-group" style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
      <label style="flex:0 0 120px; font-weight:600;">${p.name}</label>
      <select name="player-card" data-player-id="${p.id}" style="flex:1;">
        <option value="">— None —</option>
        ${optionsHtml}
      </select>
      <img class="card-preview" data-player-id="${p.id}" style="width:60px; height:auto; border:1px solid #333; border-radius:2px; visibility:hidden;" />
    </div>`).join("");

  // Card image gallery for reference
  const galleryHtml = courtCards.map(c => {
    const img = _cardImg(c);
    return `
      <div style="display:inline-block; text-align:center; margin:3px;">
        ${img ? `<img src="${img}" style="width:80px; border:1px solid #ccc; border-radius:2px;" />` : ""}
        <span style="font-size:9px; display:block;">${c.name}</span>
      </div>`;
  }).join("");

  const content = `
    <div style="margin-bottom:12px;">
      <p style="margin-bottom:8px;">Assign a court card to each player. Unchosen court cards will be shuffled into the Minor Arcana deck.</p>
      ${playerRows}
    </div>
    <details style="margin-top:8px;">
      <summary style="cursor:pointer; font-weight:600; font-size:12px;">View All Court Cards</summary>
      <div style="display:flex; flex-wrap:wrap; justify-content:center; margin-top:6px;">
        ${galleryHtml}
      </div>
    </details>`;

  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: "Choose Character Cards" },
    position: { width: 500 },
    content,
    ok: {
      label: "Assign & Merge Unchosen",
      callback: (event, button) => {
        const container = button.closest("dialog, form, .application");
        const selects = container.querySelectorAll("select[name='player-card']");
        const assignments = [];
        const chosenIds = new Set();

        for (const el of selects) {
          const playerId = el.dataset.playerId;
          const cardId = el.value;
          if (cardId) {
            assignments.push({ playerId, cardId });
            chosenIds.add(cardId);
          }
        }

        if (chosenIds.size < assignments.length) {
          ui.notifications.error("Duplicate card assignments detected. Please fix and try again.");
          return null;
        }

        return assignments;
      }
    },
    render: (event, app) => {
      const el = app.element;
      const selects = el.querySelectorAll("select[name='player-card']");

      for (const sel of selects) {
        sel.addEventListener("change", () => {
          const selected = new Set();
          for (const s of selects) {
            if (s.value) selected.add(s.value);
          }

          for (const s of selects) {
            for (const opt of s.options) {
              if (!opt.value) continue;
              opt.disabled = selected.has(opt.value) && s.value !== opt.value;
            }
          }

          for (const s of selects) {
            const preview = el.querySelector(`img.card-preview[data-player-id="${s.dataset.playerId}"]`);
            if (!preview) continue;
            if (s.value) {
              const card = courtDeck.cards.get(s.value);
              const img = card ? _cardImg(card) : "";
              preview.src = img;
              preview.style.visibility = "visible";
            } else {
              preview.style.visibility = "hidden";
            }
          }
        });
      }
    }
  });

  if (!result || result.length === 0) return;

  const table = await _getFatesTable();
  for (const { cardId } of result) {
    try {
      await courtDeck.pass(table, [cardId]);
    } catch (e) {
      console.warn(`Royal Blood | Could not pass card ${cardId} to table:`, e);
    }
  }

  const unchosen = courtDeck.availableCards;
  for (const card of unchosen) {
    const alreadyInMinor = minorDeck.cards.some(c => c.name === card.name);
    if (alreadyInMinor) continue;
    try {
      await courtDeck.pass(minorDeck, [card.id]);
    } catch (e) {
      console.warn(`Royal Blood | Could not pass card ${card.name} to minor deck:`, e);
    }
  }

  await minorDeck.shuffle();

  // Create a character actor for each player and assign ownership
  for (const { playerId, cardId } of result) {
    const player = game.users.get(playerId);
    const card = table.cards.get(cardId);
    if (!player || !card) continue;

    const existing = game.actors.find(a => a.type === "character" && a.name === card.name);
    if (existing) {
      await player.update({ character: existing.id });
      continue;
    }

    const img = _cardImg(card);
    const actor = await Actor.create({
      name: `${player.name}'s Royal`,
      type: "character",
      img: img || "icons/svg/mystery-man.svg",
      system: { courtCardImg: img || "", playerName: player.name, rank: card.name },
      ownership: {
        default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
        [playerId]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
      },
      prototypeToken: {
        name: card.name,
        texture: { src: img || "icons/svg/mystery-man.svg" },
        width: 6,
        height: 10,
        actorLink: true,
        lockRotation: true,
        movementAction: "blink",
        disposition: CONST.TOKEN_DISPOSITIONS.FRIENDLY,
        displayName: CONST.TOKEN_DISPLAY_MODES.NONE
      }
    });

    await player.update({ character: actor.id });
  }

  const chatRows = result.map(({ playerId, cardId }) => {
    const player = game.users.get(playerId);
    const card = table.cards.get(cardId);
    const img = card ? _cardImg(card) : "";
    return `
      <div style="display:inline-block; text-align:center; margin:6px;">
        ${img ? `<img src="${img}" style="max-width:120px; border:1px solid #333; border-radius:4px;" />` : ""}
        <p style="margin:4px 0 0; font-size:12px; font-weight:600;">${card?.name || "Unknown"}</p>
        <p style="margin:0; font-size:11px; color:#666;">${player?.name || "Unknown"}</p>
      </div>`;
  }).join("");

  await ChatMessage.create({
    content: `
      <div style="text-align:center;">
        <h3 style="font-variant:small-caps; margin:0 0 8px;">Characters Chosen</h3>
        <div>${chatRows}</div>
        <p style="font-size:11px; color:#666; margin:8px 0 0;">${unchosen.length} court card(s) merged into the Minor Arcana deck.</p>
      </div>`,
    speaker: { alias: "Fate Herself" },
    whisper: []
  });

  ui.notifications.info(`${result.length} character(s) assigned. ${unchosen.length} court card(s) added to Minor Arcana.`);
}

// ─── Theme Switching ─────────────────────────────────────────────

/**
 * Cycle through themes or pick one, then re-render all note tiles and the scene background.
 */
export async function switchTheme() {
  const keys = Object.keys(THEMES);
  const current = game.settings.get("royal-blood", "theme") ?? "parchment";

  const options = keys.map(k =>
    `<option value="${k}" ${k === current ? "selected" : ""}>${THEMES[k].label}</option>`
  ).join("");

  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: "Switch Theme" },
    content: `
      <div class="form-group">
        <label>Theme</label>
        <select name="theme-select">${options}</select>
      </div>`,
    ok: {
      label: "Apply",
      callback: (event, button) => {
        const container = button.closest("dialog, form, .application");
        return container.querySelector("select[name='theme-select']")?.value;
      }
    }
  });

  if (!result || result === current) return;

  await game.settings.set("royal-blood", "theme", result);
  ui.notifications.info(`Theme switched to: ${THEMES[result].label}`);

  // Re-render all note tiles on the current scene
  if (canvas.scene) {
    const tiles = canvas.scene.tiles.filter(t =>
      t.flags?.["royal-blood"]?.isCardNote || t.flags?.["royal-blood"]?.isStandaloneNote
    );

    for (const tile of tiles) {
      const flags = tile.flags["royal-blood"];
      let title, text;
      if (flags.isStandaloneNote) {
        title = flags.noteTitle;
        text = flags.noteText || "";
      } else if (flags.isCardNote) {
        title = flags.cardName;
        const actor = game.actors.get(flags.actorId);
        text = actor?.system?.notes || "";
      }
      if (title != null) {
        const { path: imagePath, height } = await _uploadNotesImage(title, text);
        await tile.update({ "texture.src": imagePath + "?t=" + Date.now(), height });
      }
    }

    // Re-render scene background
    const width = canvas.scene.width || 5000;
    const height = canvas.scene.height || 5000;
    const bgPath = await _uploadSceneBackground(canvas.scene.name, width, height);
    await canvas.scene.update({ "background.src": bgPath + "?t=" + Date.now() });
  }
}

// ─── Standalone Notes ────────────────────────────────────────────

/**
 * Place a standalone note card on the map with the same style as arcana notes.
 * Prompts for a title, then creates the tile at the viewport center.
 */
export async function placeNote() {
  if (!canvas.scene) {
    ui.notifications.warn("No active scene.");
    return;
  }

  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: "Place Note" },
    content: `
      <div class="form-group">
        <label>Title</label>
        <input type="text" name="note-title" placeholder="Note title" autofocus />
      </div>`,
    ok: {
      label: "Place",
      callback: (event, button) => {
        const container = button.closest("dialog, form, .application");
        return container.querySelector("input[name='note-title']")?.value?.trim() || "";
      }
    }
  });

  if (!result) return;

  const { path: imagePath, height } = await _uploadNotesImage(result, "");
  const center = _viewportCenter();

  await canvas.scene.createEmbeddedDocuments("Tile", [{
    texture: { src: imagePath + "?t=" + Date.now() },
    x: center.x - NOTE_WIDTH / 2,
    y: center.y - height / 2,
    width: NOTE_WIDTH,
    height,
    flags: {
      "royal-blood": {
        isStandaloneNote: true,
        noteTitle: result,
        noteText: ""
      }
    }
  }]);
}

/**
 * Open an edit dialog for a standalone note tile.
 */
async function _editStandaloneNote(tile) {
  const flags = tile.flags?.["royal-blood"];
  if (!flags?.isStandaloneNote) return;

  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: `Edit: ${flags.noteTitle}` },
    content: `
      <div class="form-group">
        <label>Title</label>
        <input type="text" name="note-title" value="${(flags.noteTitle || "").replace(/"/g, "&quot;")}" />
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea name="note-text" rows="10" style="width:100%; font-family:Signika,serif;">${flags.noteText || ""}</textarea>
      </div>`,
    ok: {
      label: "Save",
      callback: (event, button) => {
        const container = button.closest("dialog, form, .application");
        return {
          title: container.querySelector("input[name='note-title']")?.value?.trim() || flags.noteTitle,
          text: container.querySelector("textarea[name='note-text']")?.value || ""
        };
      }
    }
  });

  if (!result) return;

  const { path: imagePath, height } = await _uploadNotesImage(result.title, result.text);
  await tile.update({
    "texture.src": imagePath + "?t=" + Date.now(),
    height,
    "flags.royal-blood.noteTitle": result.title,
    "flags.royal-blood.noteText": result.text
  });
}

// ─── Card Token Hooks ───────────────────────────────────────────

/**
 * Register hooks for syncing actor notes to on-map note tiles
 * and moving tiles with tokens.
 */
export function registerCardTileHook() {
  // Socket handler: allow players to update arcana notes via GM
  game.socket.on("system.royal-blood", async (msg) => {
    if (!game.user.isGM) return;

    if (msg.action === "updateArcanaNotes") {
      const actor = game.actors.get(msg.actorId);
      if (!actor || actor.type !== "arcana") return;
      await actor.update({ "system.notes": msg.notes });
    }

    if (msg.action === "playTrickCard") {
      const hand = game.cards.get(msg.handId);
      const card = hand?.cards.get(msg.cardId);
      if (!hand || !card) return;
      await _placeTrickToken(card, hand, msg.userId);
    }
  });

  // When an arcana actor is updated, re-render the notes tile image
  Hooks.on("updateActor", async (actor, changes) => {
    if (actor.type !== "arcana") return;
    if (!foundry.utils.hasProperty(changes, "system.notes")) return;
    if (!canvas.scene) return;

    const tile = canvas.scene.tiles.find(
      t => t.flags?.["royal-blood"]?.actorId === actor.id
    );
    if (!tile) return;

    const cardName = tile.flags["royal-blood"].cardName;
    const { path: imagePath, height } = await _uploadNotesImage(cardName, changes.system.notes || "");
    await tile.update({ "texture.src": imagePath + "?t=" + Date.now(), height });
  });

  // Block non-GM movement of arcana/minor tokens, and sync notes tile for GM moves
  // Exception: players can move their own trick tokens
  Hooks.on("preUpdateToken", (tokenDoc, changes) => {
    if (!("x" in changes || "y" in changes)) return;
    const actor = tokenDoc.actor;
    if (!actor || (actor.type !== "arcana" && actor.type !== "minor")) return;

    if (!game.user.isGM) {
      delete changes.x;
      delete changes.y;
      ui.notifications.warn("Only the GM can move Arcana tokens.");
      return false;
    }

    // Move the linked notes tile with the token (major arcana only)
    if (!canvas.scene) return;
    const tile = canvas.scene.tiles.find(
      t => t.flags?.["royal-blood"]?.isCardNote && t.flags?.["royal-blood"]?.actorId === actor.id
    );
    if (!tile) return;

    const dx = (changes.x ?? tokenDoc.x) - tokenDoc.x;
    const dy = (changes.y ?? tokenDoc.y) - tokenDoc.y;
    if (dx === 0 && dy === 0) return;

    tile.update({
      x: tile.x + dx,
      y: tile.y + dy
    });
  });

  // Add HUD controls for arcana and minor arcana tokens
  Hooks.on("renderTokenHUD", (hud, html) => {
    const tokenDoc = hud.object?.document ?? hud.object;
    const actor = tokenDoc?.actor ?? game.actors.get(tokenDoc?.actorId);
    if (!actor || (actor.type !== "arcana" && actor.type !== "minor")) return;
    if (!game.user.isGM) return;

    const el = html instanceof HTMLElement ? html : html[0] ?? html;
    const gridSize = canvas.dimensions.size;
    const isFlipped = actor.system.flipped;

    // For major arcana, include notes position buttons if notes tile exists
    const tile = actor.type === "arcana" ? canvas.scene?.tiles.find(
      t => t.flags?.["royal-blood"]?.isCardNote && t.flags?.["royal-blood"]?.actorId === actor.id
    ) : null;

    let notesButtons = "";
    let positions = {};
    if (tile) {
      const pRight = tokenDoc.x + tokenDoc.width * gridSize;
      const pLeft = tokenDoc.x;
      const pTop = tokenDoc.y;
      const pBottom = tokenDoc.y + tokenDoc.height * gridSize;
      positions = {
        left:  { x: pLeft - NOTE_WIDTH - NOTE_SPACING, y: pTop },
        up:    { x: pLeft, y: pTop - tile.height - NOTE_SPACING },
        down:  { x: pLeft, y: pBottom + NOTE_SPACING },
        right: { x: pRight + NOTE_SPACING, y: pTop }
      };
      notesButtons = `
        <button type="button" class="rb-notes-btn" data-dir="left" data-tooltip="Notes Left">&#9664;</button>
        <button type="button" class="rb-notes-btn" data-dir="up" data-tooltip="Notes Above">&#9650;</button>
        <button type="button" class="rb-notes-btn" data-dir="down" data-tooltip="Notes Below">&#9660;</button>
        <button type="button" class="rb-notes-btn" data-dir="right" data-tooltip="Notes Right">&#9654;</button>
      `;
    }

    const flipLabel = actor.type === "minor"
      ? (isFlipped ? "Reveal Card" : "Flip Face-Down")
      : (isFlipped ? "Reveal Icon" : "Defeat Icon");

    const wrapper = document.createElement("div");
    wrapper.classList.add("rb-notes-position");
    wrapper.innerHTML = `
      ${notesButtons}
      <button type="button" class="rb-notes-btn rb-flip-btn" data-action="flip" data-tooltip="${flipLabel}">&#8635;</button>
    `;

    wrapper.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });

    wrapper.querySelectorAll(".rb-notes-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (btn.dataset.action === "flip") {
          flipIcon(tokenDoc);
          hud.close();
          return;
        }
        const dir = btn.dataset.dir;
        const pos = positions[dir];
        if (pos) {
          tile.update({ x: pos.x, y: pos.y });
        }
      });
    });

    el.appendChild(wrapper);
  });

  // Intercept the tile config sheet for standalone notes — open our editor instead
  Hooks.on("renderTileConfig", (app, html, data) => {
    const tileDoc = app.document ?? app.object;
    if (!tileDoc?.flags?.["royal-blood"]?.isStandaloneNote) return;
    app.close();
    _editStandaloneNote(tileDoc);
  });

  // Auto-generate parchment background for new scenes
  Hooks.on("createScene", async (scene) => {
    if (!game.user.isGM) return;
    // Skip if the scene already has a background image
    if (scene.background?.src) return;

    const width = scene.width || 4000;
    const height = scene.height || 3000;
    const bgPath = await _uploadSceneBackground(scene.name, width, height);
    await scene.update({ "background.src": bgPath });
    console.log(`Royal Blood | Generated parchment background for scene: ${scene.name}`);
  });
}

// ─── Registration ───────────────────────────────────────────────

export function registerCardHelpers() {
  game.royalblood = game.royalblood || {};
  game.royalblood.drawToSpread = drawToSpread;
  game.royalblood.drawToResolve = drawToResolve;
  game.royalblood.drawMultiple = drawMultiple;
  game.royalblood.shuffleMajor = shuffleMajor;
  game.royalblood.shuffleMinor = shuffleMinor;
  game.royalblood.mergeCourtCards = mergeCourtCards;
  game.royalblood.dealToHand = dealToHand;
  game.royalblood.playCard = playCard;
  game.royalblood.revealTrick = revealTrick;
  game.royalblood.resetAll = resetAll;
  game.royalblood.chooseCharacters = chooseCharacters;
  game.royalblood.flipIcon = flipIcon;
  game.royalblood.claimIcon = claimIcon;
  game.royalblood.dealInitialTwist = dealInitialTwist;
  game.royalblood.placeNote = placeNote;
  game.royalblood.switchTheme = switchTheme;
}

export async function createCardMacros() {
  const macros = [
    {
      name: "Draw to Spread",
      command: "game.royalblood.drawToSpread();",
      img: "icons/svg/sun.svg",
      type: "script"
    },
    {
      name: "Draw to Resolve",
      command: "game.royalblood.drawToResolve();",
      img: "icons/svg/daze.svg",
      type: "script"
    },
    {
      name: "Draw 3 (Make Things Interesting)",
      command: "game.royalblood.drawMultiple(3);",
      img: "icons/svg/card-joker.svg",
      type: "script"
    },
    {
      name: "Shuffle Major Arcana",
      command: "game.royalblood.shuffleMajor();",
      img: "icons/svg/clockwork.svg",
      type: "script"
    },
    {
      name: "Shuffle Minor Arcana",
      command: "game.royalblood.shuffleMinor();",
      img: "icons/svg/daze.svg",
      type: "script"
    },
    {
      name: "Choose Characters",
      command: "game.royalblood.chooseCharacters();",
      img: "icons/svg/mystery-man.svg",
      type: "script"
    },
    {
      name: "Merge Court Cards",
      command: "game.royalblood.mergeCourtCards();",
      img: "icons/svg/daze.svg",
      type: "script"
    },
    {
      name: "Deal to Hand",
      command: "game.royalblood.dealToHand();",
      img: "icons/svg/daze.svg",
      type: "script"
    },
    {
      name: "Play Card",
      command: "game.royalblood.playCard();",
      img: "icons/svg/daze.svg",
      type: "script",
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER }
    },
    {
      name: "Reveal Trick",
      command: "game.royalblood.revealTrick();",
      img: "icons/svg/eye.svg",
      type: "script"
    },
    {
      name: "Flip Icon",
      command: "game.royalblood.flipIcon();",
      img: "icons/svg/circle.svg",
      type: "script"
    },
    {
      name: "Deal Initial Twist",
      command: "game.royalblood.dealInitialTwist();",
      img: "icons/svg/sun.svg",
      type: "script"
    },
    {
      name: "Claim Icon",
      command: "game.royalblood.claimIcon();",
      img: "icons/svg/book.svg",
      type: "script"
    },
    {
      name: "Place Note",
      command: "game.royalblood.placeNote();",
      img: "icons/svg/book.svg",
      type: "script"
    },
    {
      name: "Switch Theme",
      command: "game.royalblood.switchTheme();",
      img: "icons/svg/eye.svg",
      type: "script"
    },
    {
      name: "Reset All",
      command: "game.royalblood.resetAll();",
      img: "icons/svg/ruins.svg",
      type: "script"
    },
    {
      name: "Rebuild Decks",
      command: "game.royalblood.rebuildDecks();",
      img: "icons/svg/upgrade.svg",
      type: "script"
    }
  ];

  for (const data of macros) {
    const exists = game.macros.find(m => m.name === data.name && m.command === data.command);
    if (!exists) {
      await Macro.create(data);
      console.log(`Royal Blood | Created macro: ${data.name}`);
    }
  }
}
