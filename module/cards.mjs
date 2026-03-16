export const MAJOR_ARCANA = [
  { value: 0, name: "The Fool" },
  { value: 1, name: "The Magician" },
  { value: 2, name: "The High Priestess" },
  { value: 3, name: "The Empress" },
  { value: 4, name: "The Emperor" },
  { value: 5, name: "The Hierophant" },
  { value: 6, name: "The Lovers" },
  { value: 7, name: "The Chariot" },
  { value: 8, name: "Strength" },
  { value: 9, name: "The Hermit" },
  { value: 10, name: "Wheel of Fortune" },
  { value: 11, name: "Justice" },
  { value: 12, name: "The Hanged Man" },
  { value: 13, name: "Death" },
  { value: 14, name: "Temperance" },
  { value: 15, name: "The Devil" },
  { value: 16, name: "The Tower" },
  { value: 17, name: "The Star" },
  { value: 18, name: "The Moon" },
  { value: 19, name: "The Sun" },
  { value: 20, name: "Judgement" },
  { value: 21, name: "The World" }
];

export const MINOR_ARCANA_SUITS = ["Wands", "Cups", "Swords", "Pentacles"];

export const MINOR_ARCANA_RANKS = [
  { value: 1, name: "Ace" },
  { value: 2, name: "Two" },
  { value: 3, name: "Three" },
  { value: 4, name: "Four" },
  { value: 5, name: "Five" },
  { value: 6, name: "Six" },
  { value: 7, name: "Seven" },
  { value: 8, name: "Eight" },
  { value: 9, name: "Nine" },
  { value: 10, name: "Ten" },
  { value: 11, name: "Page" },
  { value: 12, name: "Knight" },
  { value: 13, name: "Queen" },
  { value: 14, name: "King" }
];

export const MINOR_ARCANA = MINOR_ARCANA_SUITS.flatMap(suit =>
  MINOR_ARCANA_RANKS.map(rank => ({
    suit,
    value: rank.value,
    name: `${rank.name} of ${suit}`
  }))
);
