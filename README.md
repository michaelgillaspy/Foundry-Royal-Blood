# Royal Blood — Foundry VTT System

An unofficial Foundry VTT system for **Royal Blood**, the tarot heist RPG by Mana Project Studio and Rowan, Rook & Decard. Requires **Foundry VTT v13**.

> **Note:** This system does not include card artwork. You must supply your own tarot card images — any standard Tarot deck will work.

## Installation

### From Manifest URL

1. In Foundry, go to **Add-on Packages → Install System**
2. Paste the manifest URL: `https://github.com/michaelgillaspy/foundry-royal-blood/releases/latest/download/system.json`
3. Click **Install**
4. Add your card images (see **Setting Up Card Images** below)
5. Create a new world using the **Royal Blood** system

### Manual

1. Download or clone this repository into your Foundry VTT `Data/systems/` folder so the path is `Data/systems/royal-blood/`
2. Add your card images (see **Setting Up Card Images** below)
3. Launch Foundry and create a new world using the **Royal Blood** system

## Setting Up Card Images

The system scans image folders to build decks and actors dynamically. Place your card images in the **user data folder** so they survive system updates:

```
Data/royal-blood-files/
  cards/
    major/          ← Major Arcana (22 cards)
    minor/          ← Minor Arcana pip cards (Ace–10 per suit + Jokers)
    court/          ← Court cards (Heir, Knight, Consort, Monarch, Stranger per suit)
    backs/          ← Card back image (1 image used for all decks)
  tokens/
    coin/           ← Coin token image (1 image)
```

> **Tip:** Images placed in `Data/royal-blood-files/` persist across system updates. The system also checks `Data/systems/royal-blood/cards/` as a fallback, but those files will be overwritten when the system updates.

**Naming:** Card names are derived from filenames (minus extension). For Major Arcana, prefix with the card number for sort order:

```
0 The Fool.png
1 The Magician.png
2 The High Priestess.png
...
10 Wheel of Fortune.png
...
21 The World.png
```

Minor Arcana and Court Cards follow the same convention:

```
1 Ace of Wands.png
2 of Wands.png
...
Heir of Wands.png
Knight of Wands.png
```

Supported formats: `.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`, `.gif`

## First Launch

On first load as GM, the system automatically:

- Creates **Major Arcana**, **Minor Arcana**, and **Court Cards** decks from your images
- Creates a **Fate's Table** card pile
- Creates **Major Arcana actor sheets** (one per card) with corebook descriptions
- Creates all **macros** in the macro bar
- Creates a **Coin actor** for token placement

## Macros

All macros are created automatically on first GM login. Here's what each one does:

### Setup & Management

| Macro | Description |
|-------|-------------|
| **Choose Characters** | Players pick court cards; creates character actors with player ownership |
| **Deal Initial Twist** | Draw a Major Arcana card and assign it as a starting twist to a player |
| **Rebuild Decks** | Delete and recreate all decks from the card image folders |
| **Reset All** | Clear all character data, reclaim cards, reset decks to starting state |

### During Play — Major Arcana (The Spread)

| Macro | Description |
|-------|-------------|
| **Draw to Spread** | Draw a Major Arcana card and place it on the map as a token with a notes tile |
| **Flip Icon** | Toggle a selected Major Arcana token between face-up and defeated (face-down) |
| **Claim Icon** | Assign a defeated Major Arcana card as a twist on a player's character sheet |

### During Play — Minor Arcana (Resolution)

| Macro | Description |
|-------|-------------|
| **Draw to Resolve** | Draw a single Minor Arcana card to resolve an action |
| **Draw 3 (Make Things Interesting)** | Draw 3 Minor Arcana cards at once |
| **Shuffle Major Arcana** | Recall and shuffle the Major Arcana deck (claimed cards are preserved) |
| **Shuffle Minor Arcana** | Recall and shuffle the Minor Arcana deck |

### Coins

| Macro | Description |
|-------|-------------|
| **Place Coin** | Place a coin token on the map (works for GM and players) |
| **Clear Coins** | Remove all coin tokens from the current scene |
| **Give Coin** | GM gives coins to a player's character |
| **Spend Coin** | Player spends a coin from their character |

### Utility

| Macro | Description |
|-------|-------------|
| **Place Note** | Create a standalone styled note card on the map |
| **Switch Theme** | Change the visual theme (Parchment, Dark, or Light) |

## Themes

Three visual themes are available, affecting actor sheets, note tiles, and scene backgrounds:

- **Parchment** — Cream background, dark borders, gold accents
- **Dark** — Black background, silver accents, cream text
- **Light** — White background, dark borders, silver accents

Switch themes using the **Switch Theme** macro or via `Game Settings > System Settings > Visual Theme`. Switching re-renders all note tiles and the scene background on the current scene.

## Player Features

Players have access to:

- **Place Coin / Spend Coin** macros
- Editing the **Notes** field on Major Arcana sheets (relayed to the GM via socket)
- Viewing Major Arcana actor sheets (read-only except notes)
- Their own character sheet

Players cannot move Major Arcana tokens — only the GM can reposition them.

## Scene Defaults

New scenes are automatically configured with:

- 5040 x 5040 pixel dimensions
- 60px grid size (aligned to tarot card token width)
- Invisible grid
- Global illumination (no token vision restrictions)
- Auto-generated themed background

## Custom Arcana Data

To override the built-in Major Arcana descriptions, create a JSON file at:

```
Data/royal-blood-files/cards/major-arcana-data.json
```

Format:

```json
[
  {
    "name": "The Fool",
    "subtitle": "Custom Subtitle",
    "description": "Custom description text...",
    "person": "Custom person example...",
    "location": "Custom location example...",
    "object": "Custom object example..."
  }
]
```

Only include cards you want to override — the rest fall back to built-in defaults. You can also add entirely new entries for custom cards.

## Character Sheet

Each character has:

- **Rank** and **Name** — displayed in the header
- **Description** — freeform text
- **Coins** — tracked numerically
- **3 Facets** — each with Lead, Silver, Marked, and Lost toggles plus a description
- **Royal to your Left / Right** — name, question, and answer fields
- **Twists** — a table of twist items (name, effect, used toggle)
- **Secrets** and **Notes** — freeform text areas

## Credits

Royal Blood is published by [Rowan, Rook & Decard](https://rowanrookanddecard.com/) in partnership with [Mana Project Studio](https://www.manaprojectstudio.com/). This is an unofficial, fan-made system and is not affiliated with or endorsed by the publishers.

Built with the assistance of [Claude Code](https://claude.ai/code) (AI pair programming).
