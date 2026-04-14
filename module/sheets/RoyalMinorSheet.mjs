import { findTouchstones } from "../minor-arcana-data.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export class RoyalMinorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["royal-blood", "sheet", "actor", "minor"],
    position: {
      width: 500,
      height: 650
    },
    window: {
      resizable: true
    },
    form: {
      submitOnChange: false
    }
  };

  static PARTS = {
    minor: {
      template: "systems/royal-blood/templates/actor/minor-sheet.hbs"
    }
  };

  get title() {
    return this.document.name;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.actor = this.document;
    context.touchstones = findTouchstones(this.document.name);
    return context;
  }
}
