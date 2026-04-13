const { CardsHand } = foundry.appv1.sheets;

export class RoyalHandSheet extends CardsHand {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["royal-blood", "sheet", "hand"],
      template: "systems/royal-blood/templates/cards/hand-sheet.hbs",
      width: 500,
      height: 400,
      resizable: true
    });
  }

  get title() {
    return this.document.name;
  }

  async getData(options) {
    const context = await super.getData(options);
    context.cards = this.document.cards.contents.map(card => ({
      id: card.id,
      name: card.name,
      img: card.faces?.[0]?.img || card.img || ""
    }));
    context.isEmpty = context.cards.length === 0;
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    const el = html instanceof HTMLElement ? html : html[0] ?? html;

    const playBtn = el.querySelector(".rb-play-card-btn");
    if (playBtn) {
      playBtn.addEventListener("click", () => {
        game.royalblood?.playCard();
      });
    }
  }
}
