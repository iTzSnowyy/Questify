// js/shop-items.js
// Static shop inventory and helper functions for equipment bonuses
export const SHOP_ITEMS = [
  {
    id: "iron_sword",
    name: "Iron Sword",
    description: "A sturdy blade",
    cost: 50,
    stats: { strength: 5, dexterity: 0, intelligence: 0 },
    image: "assets/iron_sword.png"
  },
  {
    id: "leather_armor",
    name: "Leather Armor",
    description: "Light protection",
    cost: 40,
    stats: { strength: 2, dexterity: 3, intelligence: 0 },
    image: "assets/leather_armour.png"
  },
  {
    id: "enchanted_ring",
    name: "Enchanted Ring",
    description: "Boosts intellect",
    cost: 60,
    stats: { strength: 0, dexterity: 1, intelligence: 4 },
    image: "assets/enchanted_ring.png"
  },
  {
    id: "shadow_cloak",
    name: "Shadow Cloak",
    description: "Increases agility",
    cost: 55,
    stats: { strength: 1, dexterity: 6, intelligence: 1 },
    image: "assets/shadow_cloak.png"
  },
  {
    id: "dragon_scale",
    name: "Dragon Scale Armor",
    description: "Powerful protection",
    cost: 100,
    stats: { strength: 4, dexterity: 2, intelligence: 2 },
    image: "assets/dragon_scale_armour.png"
  },
  {
    id: "wizard_staff",
    name: "Wizard's Staff",
    description: "Ancient magical artifact",
    cost: 80,
    stats: { strength: 0, dexterity: 0, intelligence: 6 },
    image: "assets/wizard_staff.png"
  }
];

// Sum the total stat bonuses from all equipped items
export function getEquipmentBonuses(equipment) {
  const bonuses = { strength: 0, dexterity: 0, intelligence: 0 };
  equipment?.forEach(itemId => {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (item) {
      bonuses.strength += item.stats.strength || 0;
      bonuses.dexterity += item.stats.dexterity || 0;
      bonuses.intelligence += item.stats.intelligence || 0;
    }
  });
  return bonuses;
}
