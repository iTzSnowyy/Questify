// js/shop.js
import { auth, onAuthStateChanged, db, doc, getDoc, updateDoc } from "./firebase-config.js";
import { SHOP_ITEMS } from "./shop-items.js";

const shopItemsEl = document.getElementById("shop-items");
const coinsEl = document.getElementById("coins");
const messageEl = document.getElementById("shop-message");

let currentUser = null;

// Render the shop whenever there is a signed-in user
onAuthStateChanged(auth, async user => {
  currentUser = user;
  if (user) {
    renderShop();
  }
});

// Build the shop UI from the item list and user profile
async function renderShop() {
  const profile = await getProfile();
  coinsEl.textContent = profile?.coins || 0;

  shopItemsEl.innerHTML = "";

  SHOP_ITEMS.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";

    const owned = profile?.equipment?.includes(item.id) || false;
    const canAfford = (profile?.coins || 0) >= item.cost;

    const statBonuses = Object.entries(item.stats)
      .filter(([_, val]) => val > 0)
      .map(([stat, val]) => `${stat.toUpperCase().charAt(0)} +${val}`)
      .join(", ");

    card.innerHTML = `
      <img src="${item.image}" alt="${item.name}" class="shop-item-img">
      <h3 class="shop-name">${item.name}</h3>
      <p class="shop-desc">${item.description}</p>
      <p class="shop-cost">${item.cost} coins</p>
      <p class="shop-stats">${statBonuses}</p>
      ${
        owned
          ? `<p class="shop-owned">✓ Owned</p>`
          : `<button class="buy-btn btn shop-buy-btn" data-item-id="${item.id}" ${!canAfford ? "disabled" : ""}>Buy</button>`
      }
    `;

    if (!owned && canAfford) {
      card.querySelector(".buy-btn").addEventListener("click", () => buyItem(item));
    }

    shopItemsEl.appendChild(card);
  });
}

// Handle a purchase by subtracting coins and adding the item to equipment
async function buyItem(item) {
  if (!currentUser) return;

  const profile = await getProfile();
  if (!profile || profile.coins < item.cost) {
    messageEl.textContent = "Not enough coins!";
    setTimeout(() => {
      messageEl.textContent = "";
    }, 3000);
    return;
  }

  const equipment = profile.equipment || [];
  if (equipment.includes(item.id)) {
    messageEl.textContent = "You already own this item!";
    setTimeout(() => {
      messageEl.textContent = "";
    }, 3000);
    return;
  }

  equipment.push(item.id);
  const userRef = doc(db, "users", currentUser.uid);
  await updateDoc(userRef, {
    coins: profile.coins - item.cost,
    equipment: equipment
  });

  messageEl.textContent = `Purchased ${item.name}!`;
  messageEl.style.color = "#22c55e";
  setTimeout(() => {
    messageEl.textContent = "";
    messageEl.style.color = "#f97316";
    renderShop();
  }, 3000);
}

// Fetch the current user's profile from Firestore
async function getProfile() {
  if (!currentUser) return null;
  const userRef = doc(db, "users", currentUser.uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() : null;
}

