import { RoyalCharacterSheet } from "./sheets/RoyalCharacterSheet.mjs";
import { RoyalTwistSheet } from "./sheets/RoyalTwistSheet.mjs";
import { RoyalArcanaSheet } from "./sheets/RoyalArcanaSheet.mjs";
import { RoyalMinorSheet } from "./sheets/RoyalMinorSheet.mjs";
// import { RoyalHandSheet } from "./sheets/RoyalHandSheet.mjs";
import { registerCardHelpers, createCardMacros, registerCardTileHook, createArcanaActors, createMinorArcanaActors, ensureUserDataFolders } from "./card-helpers.mjs";
import { setupDecks, rebuildDecks } from "./deck-builder.mjs";
import { registerCoinHelpers, registerCoinSocket, createCoinMacros } from "./coin-helpers.mjs";
import { loadArcanaData } from "./major-arcana-data.mjs";
import { loadTouchstones } from "./minor-arcana-data.mjs";

const { ActorSheet: ActorSheetV1 } = foundry.appv1.sheets;
const { ItemSheet: ItemSheetV1 } = foundry.appv1.sheets;

function _applyThemeClass() {
  const theme = game.settings.get("royal-blood", "theme") ?? "parchment";
  document.body.classList.remove("royal-blood-parchment", "royal-blood-dark", "royal-blood-light");
  document.body.classList.add(`royal-blood-${theme}`);
}

Hooks.once("init", () => {
  console.log("Royal Blood | Initializing Royal Blood system");

  // Register theme setting
  game.settings.register("royal-blood", "theme", {
    name: "Visual Theme",
    hint: "Choose the visual style for note cards and scene backgrounds.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      parchment: "Parchment (cream + gold)",
      dark: "Dark (black + silver)",
      light: "Light (white + silver)"
    },
    default: "parchment",
    onChange: () => _applyThemeClass()
  });

  // Register actor sheets
  foundry.documents.collections.Actors.unregisterSheet("core", ActorSheetV1);
  foundry.documents.collections.Actors.registerSheet("royal-blood", RoyalCharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "ROYALBLOOD.SheetCharacter"
  });
  foundry.documents.collections.Actors.registerSheet("royal-blood", RoyalArcanaSheet, {
    types: ["arcana"],
    makeDefault: true,
    label: "ROYALBLOOD.SheetArcana"
  });
  foundry.documents.collections.Actors.registerSheet("royal-blood", RoyalMinorSheet, {
    types: ["minor"],
    makeDefault: true,
    label: "ROYALBLOOD.SheetMinor"
  });

  // Register item sheets
  foundry.documents.collections.Items.unregisterSheet("core", ItemSheetV1);
  foundry.documents.collections.Items.registerSheet("royal-blood", RoyalTwistSheet, {
    types: ["twist"],
    makeDefault: true,
    label: "ROYALBLOOD.SheetTwist"
  });

  // Customize the default hand sheet — strip editing controls
  Hooks.on("renderCardsConfig", (app, html) => {
    const el = html instanceof HTMLElement ? html : html[0] ?? html;
    const doc = app.document ?? app.object;
    if (!doc || doc.type !== "hand") return;

    const cards = doc.cards.contents;
    const isEmpty = cards.length === 0;

    const grid = isEmpty
      ? `<p style="text-align:center; font-style:italic; padding:24px; color:#999;">Your hand is empty.</p>`
      : `<div style="display:flex; flex-wrap:wrap; justify-content:center; gap:10px; padding:12px;">
          ${cards.map(c => {
            const img = c.faces?.[0]?.img || c.img || "";
            return `<div style="text-align:center; width:120px;">
              ${img ? `<img src="${img}" style="width:120px; border-radius:4px; border:1px solid #444;" />` : ""}
              <p style="font-size:12px; margin:4px 0 0;">${c.name}</p>
            </div>`;
          }).join("")}
        </div>`;

    const playBtn = `<div style="text-align:center; padding:10px; border-top:1px solid #444;">
      <button type="button" class="rb-play-from-hand" style="padding:6px 24px; cursor:pointer;">Play Card</button>
    </div>`;

    // Replace the window-content section
    const body = el.querySelector("section.window-content");
    if (body) {
      body.innerHTML = grid + playBtn;
      body.querySelector(".rb-play-from-hand")?.addEventListener("click", () => {
        game.royalblood?.playCard();
      });
    }

    // Remove the controls dropdown menu
    const menu = el.querySelector("menu.controls-dropdown");
    if (menu) menu.remove();
  });

  // Apply theme class to body
  _applyThemeClass();

  // Preload Handlebars templates
  foundry.applications.handlebars.loadTemplates([
    "systems/royal-blood/templates/actor/character-header.hbs",
    "systems/royal-blood/templates/actor/character-front.hbs",
    "systems/royal-blood/templates/actor/character-back.hbs",
    "systems/royal-blood/templates/actor/arcana-sheet.hbs",
    "systems/royal-blood/templates/actor/minor-sheet.hbs",
    "systems/royal-blood/templates/item/twist-sheet.hbs",
    "systems/royal-blood/templates/cards/hand-sheet.hbs"
  ]);
});

// Default new scenes to invisible grid and unrestricted vision
Hooks.on("preCreateScene", (scene) => {
  scene.updateSource({
    width: 5040,
    height: 5040,
    "grid.size": 60,
    "grid.alpha": 0,
    "environment.globalLight.enabled": true,
    "tokenVision": false
  });
});

// Hide distance measurement when dragging tokens
Hooks.on("measureDistances", () => false);

// Remove status effects from token HUD — not used in this system
Hooks.on("renderTokenHUD", (hud, html) => {
  const el = html instanceof HTMLElement ? html : html[0] ?? html;
  const right = el.querySelector(".col.right");
  if (right) right.remove();
});

Hooks.once("ready", async () => {
  // Create user data folder structure
  if (game.user.isGM) await ensureUserDataFolders();

  // Load custom arcana data and touchstones (if any) before creating actors
  await loadArcanaData();
  await loadTouchstones();

  // Expose card helper functions on game.royalblood
  registerCardHelpers();
  registerCardTileHook();
  registerCoinHelpers();
  registerCoinSocket();

  // Expose deck builder
  game.royalblood.setupDecks = setupDecks;
  game.royalblood.rebuildDecks = rebuildDecks;

  // Auto-create macros, decks, and journal entries for the GM on first load
  if (game.user.isGM) {
    createCardMacros();
    createCoinMacros();
    createArcanaActors();
    createMinorArcanaActors();
  }
});
