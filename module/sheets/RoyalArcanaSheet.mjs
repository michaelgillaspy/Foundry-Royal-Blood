const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export class RoyalArcanaSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["royal-blood", "sheet", "actor", "arcana"],
    position: {
      width: 500,
      height: 700
    },
    window: {
      resizable: true
    },
    form: {
      submitOnChange: true
    }
  };

  static PARTS = {
    arcana: {
      template: "systems/royal-blood/templates/actor/arcana-sheet.hbs"
    }
  };

  get title() {
    return this.document.name;
  }

  get isEditable() {
    // Allow observers to "edit" — we handle permissions per-field
    if (this.document.testUserPermission(game.user, "OBSERVER")) return true;
    return super.isEditable;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.system = this.document.system;
    context.actor = this.document;
    return context;
  }

  _onRender(context, options) {
    super._onRender(context, options);

    // For non-owner users, only allow notes editing via socket
    if (!this.document.isOwner) {
      // Disable all inputs except the notes textarea
      const allInputs = this.element.querySelectorAll("input, select, textarea");
      for (const input of allInputs) {
        if (input.name === "system.notes") continue;
        input.setAttribute("disabled", "");
      }

      const textarea = this.element.querySelector("textarea[name='system.notes']");
      if (textarea) {
        textarea.removeAttribute("disabled");
        textarea.removeAttribute("readonly");

        textarea.addEventListener("change", (event) => {
          event.stopPropagation();
          game.socket.emit("system.royal-blood", {
            action: "updateArcanaNotes",
            actorId: this.document.id,
            notes: event.target.value
          });
        });
      }
    }
  }

  async _processSubmitData(event, form, submitData) {
    // For non-owners, block the normal form submission
    if (!this.document.isOwner) return;
    return super._processSubmitData(event, form, submitData);
  }
}
