const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export class RoyalCharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["royal-blood", "sheet", "actor", "character"],
    position: {
      width: 800,
      height: 610
    },
    window: {
      resizable: true
    },
    form: {
      submitOnChange: true
    },
    actions: {
      facetToggle: RoyalCharacterSheet.#onFacetToggle,
      itemCreate: RoyalCharacterSheet.#onItemCreate,
      itemEdit: RoyalCharacterSheet.#onItemEdit,
      itemDelete: RoyalCharacterSheet.#onItemDelete,
      itemToggle: RoyalCharacterSheet.#onItemToggle
    }
  };

  static PARTS = {
    header: {
      template: "systems/royal-blood/templates/actor/character-header.hbs"
    },
    tabs: {
      template: "templates/generic/tab-navigation.hbs"
    },
    front: {
      template: "systems/royal-blood/templates/actor/character-front.hbs",
      scrollable: [""]
    },
    royals: {
      template: "systems/royal-blood/templates/actor/character-royals.hbs",
      scrollable: [""]
    },
    back: {
      template: "systems/royal-blood/templates/actor/character-back.hbs",
      scrollable: [""]
    }
  };

  static TABS = {
    primary: {
      tabs: [
        { id: "front", group: "primary", icon: "", label: "ROYALBLOOD.TabFront" },
        { id: "royals", group: "primary", icon: "", label: "ROYALBLOOD.TabRoyals" },
        { id: "back", group: "primary", icon: "", label: "ROYALBLOOD.TabBack" }
      ],
      initial: "front"
    }
  };

  tabGroups = {
    primary: "front"
  };

  get title() {
    return this.document.name;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.system = this.document.system;
    context.actor = this.document;
    context.twists = this.document.items.filter(i => i.type === "twist");
    context.tabs = this._getTabs();
    return context;
  }

  async _preparePartContext(partId, context) {
    const partContext = await super._preparePartContext(partId, context);
    partContext.system = context.system;
    partContext.actor = context.actor;
    partContext.twists = context.twists;
    partContext.tabs = context.tabs;
    partContext.tab = partContext.tabs[partId] || partContext.tabs.royals;
    return partContext;
  }

  _getTabs() {
    const tabs = {};
    for (const [groupId, groupConfig] of Object.entries(RoyalCharacterSheet.TABS)) {
      for (const tab of groupConfig.tabs) {
        tabs[tab.id] = {
          ...tab,
          active: this.tabGroups[tab.group] === tab.id,
          cssClass: this.tabGroups[tab.group] === tab.id ? "active" : ""
        };
      }
    }
    return tabs;
  }

  _onRender(context, options) {
    super._onRender(context, options);

    if (!this.isEditable) return;

    // Inline edits for twist items (change events need manual binding)
    const html = this.element;
    html.querySelectorAll(".item-inline-edit").forEach(el => {
      el.addEventListener("change", this.#onItemInlineEdit.bind(this));
    });
  }

  static async #onFacetToggle(event, target) {
    const facet = target.dataset.facet;
    const field = target.dataset.field;
    const current = this.document.system[facet][field];
    await this.document.update({ [`system.${facet}.${field}`]: !current });
  }

  static async #onItemCreate(event, target) {
    const type = target.dataset.type;
    const itemData = {
      name: game.i18n.format("ROYALBLOOD.NewItem", { type: game.i18n.localize(`ITEM.Type${type.capitalize()}`) }),
      type: type
    };
    await Item.create(itemData, { parent: this.document });
  }

  static async #onItemEdit(event, target) {
    const li = target.closest("[data-item-id]");
    const item = this.document.items.get(li.dataset.itemId);
    item.sheet.render(true);
  }

  static async #onItemDelete(event, target) {
    const li = target.closest("[data-item-id]");
    const item = this.document.items.get(li.dataset.itemId);
    await item.delete();
  }

  static async #onItemToggle(event, target) {
    const li = target.closest("[data-item-id]");
    const item = this.document.items.get(li.dataset.itemId);
    const field = target.dataset.field;
    await item.update({ [`system.${field}`]: !item.system[field] });
  }

  async #onItemInlineEdit(event) {
    const li = event.currentTarget.closest("[data-item-id]");
    const item = this.document.items.get(li.dataset.itemId);
    const field = event.currentTarget.dataset.field;
    let value = event.currentTarget.value;
    if (event.currentTarget.type === "number") value = Number(value);
    const key = field === "name" ? "name" : `system.${field}`;
    await item.update({ [key]: value });
  }
}
