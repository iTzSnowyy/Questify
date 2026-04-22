// Static avatar definitions used across the character setup and profile pages
export const AVATARS = [
  {
    id: "shadow_knight",
    name: "Shadow Knight",
    cls: "Warrior Class",
    stats: ["STR: 13", "DEX: 9", "INT: 8"],
    accentColour: "#28134b",
    imageSrc: "assets/shadow_knight.png",
    svgFallback: `<rect x="0" y="0" width="110" height="110" rx="20" ry="20" fill="#1a1b2f" />
      <text x="55" y="62" fill="#a5b4fc" font-size="10" text-anchor="middle">Shadow Knight</text>`
  },
  {
    id: "amethyst_mage",
    name: "Amethyst Mage",
    cls: "Mage Class",
    stats: ["STR: 7", "DEX: 10", "INT: 14"],
    accentColour: "#ff9fea",
    imageSrc: "assets/female_mage.png",
    svgFallback: `<rect x="0" y="0" width="110" height="110" rx="20" ry="20" fill="#1a1b2f" />
      <text x="55" y="62" fill="#a5b4fc" font-size="10" text-anchor="middle">Amethyst Mage</text>`
  },
  {
    id: "forest_scout",
    name: "Forest Scout",
    cls: "Ranger Class",
    stats: ["STR: 9", "DEX: 14", "INT: 10"],
    accentColour: "#16a34a",
    imageSrc: "assets/forest_archer.png",
    svgFallback: `<rect x="0" y="0" width="110" height="110" rx="20" ry="20" fill="#1a1b2f" />
      <text x="55" y="62" fill="#a5b4fc" font-size="10" text-anchor="middle">Forest Scout</text>`
  },
  {
    id: "storm_paladin",
    name: "Storm Paladin",
    cls: "Paladin Class",
    stats: ["STR: 12", "DEX: 10", "INT: 11"],
    accentColour: "#0ea5e9",
    imageSrc: "assets/storm_paladin.png",
    svgFallback: `<rect x="0" y="0" width="110" height="110" rx="20" ry="20" fill="#1a1b2f" />
      <text x="55" y="62" fill="#a5b4fc" font-size="10" text-anchor="middle">Storm Paladin</text>`
  }
];

// Convert the avatar stat strings into a numeric stats object
export function getStatValues(avatar) {
  const values = { strength: 5, dexterity: 5, intelligence: 5 };
  avatar.stats.forEach(stat => {
    const [type, val] = stat.split(":");
    const num = parseInt(val, 10);
    if (type === "STR") values.strength = num;
    else if (type === "DEX") values.dexterity = num;
    else if (type === "INT") values.intelligence = num;
  });
  return values;
}

// Helper for finding the avatar object by its ID
export function getAvatarById(id) {
  return AVATARS.find(avatar => avatar.id === id) || null;
}
