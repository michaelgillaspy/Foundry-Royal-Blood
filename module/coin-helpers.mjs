/**
 * Royal Blood — Coin helper functions.
 * Coins are tokens (from a "Coin" actor) that both GM and players can place and move.
 */

const COIN_SIZE = 100;
const COIN_FOLDER = "systems/royal-blood/tokens/coin";

/**
 * Scan the coin folder and return the first image found.
 */
async function _getCoinImg() {
  try {
    const result = await foundry.applications.apps.FilePicker.implementation.browse("data", COIN_FOLDER, {
      extensions: [".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"]
    });
    if (result.files.length > 0) return result.files[0];
  } catch (e) {
    console.warn("Royal Blood | Could not browse coin folder:", e);
  }
  return "";
}

/**
 * Find or create the Coin actor used as the prototype for coin tokens.
 */
async function _getCoinActor() {
  let actor = game.actors.find(a => a.type === "coin" && a.name === "Coin");
  if (actor) return actor;

  const img = await _getCoinImg();
  if (!img) {
    ui.notifications.warn("No coin image found in tokens/coin/ folder.");
    return null;
  }

  actor = await Actor.create({
    name: "Coin",
    type: "coin",
    img: img,
    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER },
    prototypeToken: {
      name: "Coin",
      texture: { src: img },
      width: COIN_SIZE / canvas.dimensions.size,
      height: COIN_SIZE / canvas.dimensions.size,
      disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
      actorLink: false,
      displayName: CONST.TOKEN_DISPLAY_MODES.NONE,
      displayBars: CONST.TOKEN_DISPLAY_MODES.NONE,
      lockRotation: true,
      movementAction: "blink"
    }
  });

  console.log("Royal Blood | Created Coin actor.");
  return actor;
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

/**
 * Place a coin token on the map. Works for both GM and players.
 */
export async function placeCoin() {
  if (!canvas.scene) {
    ui.notifications.warn("No active scene.");
    return;
  }

  if (game.user.isGM) {
    await _placeCoinToken();
  } else {
    game.socket.emit("system.royal-blood", {
      action: "placeCoin",
      data: _viewportCenter()
    });
  }
}

/**
 * Actually create the coin token (GM only).
 */
async function _placeCoinToken(position) {
  const actor = await _getCoinActor();
  if (!actor) return;

  const center = position || _viewportCenter();
  const gridSize = canvas.dimensions.size;
  const tokenSize = COIN_SIZE / gridSize;

  const tokenData = {
    name: "Coin",
    actorId: actor.id,
    texture: { src: actor.prototypeToken.texture.src },
    width: tokenSize,
    height: tokenSize,
    x: center.x - COIN_SIZE / 2,
    y: center.y - COIN_SIZE / 2,
    disposition: CONST.TOKEN_DISPOSITIONS.NEUTRAL,
    displayName: CONST.TOKEN_DISPLAY_MODES.NONE,
    displayBars: CONST.TOKEN_DISPLAY_MODES.NONE,
    actorLink: false,
    lockRotation: true,
    movementAction: "blink"
  };

  await canvas.scene.createEmbeddedDocuments("Token", [tokenData]);
}

/**
 * Clear all coin tokens from the map.
 */
export async function clearCoins() {
  if (!canvas.scene) return;

  const coinActor = game.actors.find(a => a.type === "coin" && a.name === "Coin");
  if (!coinActor) {
    ui.notifications.info("No coins on the map.");
    return;
  }

  const tokens = canvas.scene.tokens.filter(t => t.actorId === coinActor.id);
  if (tokens.length === 0) {
    ui.notifications.info("No coins on the map.");
    return;
  }

  if (game.user.isGM) {
    await canvas.scene.deleteEmbeddedDocuments("Token", tokens.map(t => t.id));
    ui.notifications.info(`Cleared ${tokens.length} coin(s) from the map.`);
  } else {
    game.socket.emit("system.royal-blood", { action: "clearCoins" });
  }
}

/**
 * GM gives a coin to a player's character.
 */
export async function giveCoin() {
  const characters = game.actors.filter(a => a.type === "character");
  if (characters.length === 0) {
    ui.notifications.warn("No characters found.");
    return;
  }

  const options = characters.map(a =>
    `<option value="${a.id}">${a.name} (${a.system.coins || 0} coins)</option>`
  ).join("");

  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: "Give Coin" },
    content: `
      <div>
        <div class="form-group">
          <label>Character</label>
          <select name="char-select">${options}</select>
        </div>
        <div class="form-group">
          <label>Amount</label>
          <input type="number" name="coin-amount" value="1" min="1" style="width:60px;" />
        </div>
      </div>`,
    ok: {
      label: "Give",
      callback: (event, button) => {
        const container = button.closest("dialog, form, .application");
        const actorId = container.querySelector("select[name='char-select']")?.value;
        const amount = parseInt(container.querySelector("input[name='coin-amount']")?.value) || 1;
        return { actorId, amount };
      }
    }
  });

  if (!result) return;
  const actor = game.actors.get(result.actorId);
  if (!actor) return;

  const current = actor.system.coins || 0;
  await actor.update({ "system.coins": current + result.amount });
  await ChatMessage.create({
    content: `<p style="text-align:center; font-variant:small-caps;"><strong>${actor.name}</strong> received <strong>${result.amount}</strong> coin${result.amount > 1 ? "s" : ""}. (Total: ${current + result.amount})</p>`,
    speaker: { alias: "Fate Herself" }
  });
}

/**
 * Player spends a coin from their character.
 */
export async function spendCoin() {
  const actor = game.user.character || game.actors.find(a => a.type === "character" && a.isOwner);
  if (!actor) {
    ui.notifications.warn("No character found. Make sure you have an assigned character.");
    return;
  }

  const current = actor.system.coins || 0;
  if (current <= 0) {
    ui.notifications.warn(`${actor.name} has no coins to spend.`);
    return;
  }

  await actor.update({ "system.coins": current - 1 });

  await ChatMessage.create({
    content: `<p style="text-align:center; font-variant:small-caps;"><strong>${actor.name}</strong> spends a coin to bribe Fate. (${current - 1} remaining)</p>`,
    speaker: ChatMessage.getSpeaker({ actor })
  });
}

/**
 * Register socket listener for coin actions (GM-side).
 */
export function registerCoinSocket() {
  game.socket.on("system.royal-blood", async (msg) => {
    if (!game.user.isGM) return;

    switch (msg.action) {
      case "placeCoin":
        await _placeCoinToken(msg.data);
        break;
      case "clearCoins": {
        const coinActor = game.actors.find(a => a.type === "coin" && a.name === "Coin");
        if (!coinActor) return;
        const tokens = canvas.scene.tokens.filter(t => t.actorId === coinActor.id);
        if (tokens.length > 0) {
          await canvas.scene.deleteEmbeddedDocuments("Token", tokens.map(t => t.id));
        }
        break;
      }
    }
  });
}

/**
 * Register all coin helpers on game.royalblood.
 */
export function registerCoinHelpers() {
  game.royalblood.placeCoin = placeCoin;
  game.royalblood.clearCoins = clearCoins;
  game.royalblood.giveCoin = giveCoin;
  game.royalblood.spendCoin = spendCoin;
}

/**
 * Create coin macros if they don't exist.
 */
export async function createCoinMacros() {
  const macros = [
    {
      name: "Place Coin",
      command: "game.royalblood.placeCoin();",
      img: "icons/svg/coins.svg",
      type: "script",
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER }
    },
    {
      name: "Clear Coins",
      command: "game.royalblood.clearCoins();",
      img: "icons/svg/cancel.svg",
      type: "script"
    },
    {
      name: "Give Coin",
      command: "game.royalblood.giveCoin();",
      img: "icons/svg/chest.svg",
      type: "script"
    },
    {
      name: "Spend Coin",
      command: "game.royalblood.spendCoin();",
      img: "icons/svg/tankard.svg",
      type: "script",
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER }
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
