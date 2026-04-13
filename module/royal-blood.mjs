import { RoyalCharacterSheet } from "./sheets/RoyalCharacterSheet.mjs";
import { RoyalTwistSheet } from "./sheets/RoyalTwistSheet.mjs";
import { RoyalArcanaSheet } from "./sheets/RoyalArcanaSheet.mjs";
import { registerCardHelpers, createCardMacros, registerCardTileHook, createArcanaActors, ensureUserDataFolders } from "./card-helpers.mjs";
import { setupDecks, rebuildDecks } from "./deck-builder.mjs";
import { registerCoinHelpers, registerCoinSocket, createCoinMacros } from "./coin-helpers.mjs";
import { loadArcanaData } from "./major-arcana-data.mjs";

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

  // Register item sheets
  foundry.documents.collections.Items.unregisterSheet("core", ItemSheetV1);
  foundry.documents.collections.Items.registerSheet("royal-blood", RoyalTwistSheet, {
    types: ["twist"],
    makeDefault: true,
    label: "ROYALBLOOD.SheetTwist"
  });

  // Apply theme class to body
  _applyThemeClass();

  // Preload Handlebars templates
  foundry.applications.handlebars.loadTemplates([
    "systems/royal-blood/templates/actor/character-header.hbs",
    "systems/royal-blood/templates/actor/character-front.hbs",
    "systems/royal-blood/templates/actor/character-back.hbs",
    "systems/royal-blood/templates/actor/arcana-sheet.hbs",
    "systems/royal-blood/templates/item/twist-sheet.hbs"
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

  // Load custom arcana data (if any) before creating actors
  await loadArcanaData();

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
  }
});
