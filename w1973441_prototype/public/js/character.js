// js/character.js
import { auth, onAuthStateChanged, db, doc, getDoc } from "./firebase-config.js";
import { SHOP_ITEMS, getEquipmentBonuses } from "./shop-items.js";
import { getAvatarById } from "./avatars.js";

// Display the list of currently equipped shop items on the character page
function updateEquipmentDisplay(profile) {
  const equipmentList = document.getElementById("equipment-list");
  const equipment = profile?.equipment || [];
  if (!equipmentList) return;

  if (equipment.length === 0) {
    equipmentList.textContent = "No items equipped";
    return;
  }

  const items = equipment
    .map(itemId => {
      const item = SHOP_ITEMS.find(i => i.id === itemId);
      return item ? item.name : itemId;
    })
    .join(", ");

  equipmentList.innerHTML = `<strong>Items:</strong> ${items}`;
}

// Load the saved profile when the current user changes and apply it to the page
// Re-sync the character display whenever auth state changes
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      const bonuses = getEquipmentBonuses(data.equipment);

      // Update equipment display
      updateEquipmentDisplay(data);

      // Update stat displays with bonuses
      const strBonusEl = document.getElementById("char-str-bonus");
      const dexBonusEl = document.getElementById("char-dex-bonus");
      const intBonusEl = document.getElementById("char-int-bonus");

      if (strBonusEl) strBonusEl.textContent = bonuses.strength;
      if (dexBonusEl) dexBonusEl.textContent = bonuses.dexterity;
      if (intBonusEl) intBonusEl.textContent = bonuses.intelligence;

      // Update avatar
      const avatarId = data.avatarId;
      const img = document.getElementById("character-avatar");
      if (img) {
        if (avatarId) {
          const avatar = getAvatarById(avatarId);
          if (avatar) {
            img.src = avatar.imageSrc;
          } else {
            img.src = "assets/shadow_knight.png";
          }
        } else {
          img.src = "assets/shadow_knight.png";
        }
      }
    }
  }
});
