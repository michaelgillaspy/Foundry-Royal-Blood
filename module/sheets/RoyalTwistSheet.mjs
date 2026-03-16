const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class RoyalTwistSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["royal-blood", "sheet", "item", "twist"],
    position: {
      width: 400,
      height: 300
    },
    window: {
      resizable: true
    },
    form: {
      submitOnChange: true
    }
  };

  static PARTS = {
    twist: {
      template: "systems/royal-blood/templates/item/twist-sheet.hbs"
    }
  };

  get title() {
    return this.document.name;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.system = this.document.system;
    context.item = this.document;
    return context;
  }
}
