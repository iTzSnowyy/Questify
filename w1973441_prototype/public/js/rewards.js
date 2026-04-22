// js/rewards.js
import { auth, onAuthStateChanged, db, doc, setDoc, getDoc, updateDoc } from "./firebase-config.js";

const charLevelSpan = document.getElementById("char-level");
const charXpSpan = document.getElementById("char-xp");
const charXpMaxSpan = document.getElementById("char-xp-max");
const xpBar = document.getElementById("xp-bar");
const charCoinsSpan = document.getElementById("char-coins");
const charPointsSpan = document.getElementById("char-points");
const charStrSpan = document.getElementById("char-str");
const charDexSpan = document.getElementById("char-dex");
const charIntSpan = document.getElementById("char-int");

// XP threshold formula for each level
export function getXpThreshold(level) {
  return 100 + (level - 1) * 50;
}

// Create a new user profile document when someone registers
export async function initUserProfile(uid, email) {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, {
    email,
    level: 1,
    xp: 0,
    coins: 0,
    skillPoints: 0
  });
}

// Read the user profile from Firestore
export async function getUserProfile(uid) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) return snap.data();
  return null;
}

// Grant XP and coins, then handle level-ups and skill points
export async function addReward(uid, xpGain, coinGain) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  let { level, xp, coins, skillPoints, stats } = snap.data();
  xp += xpGain;
  coins += coinGain;

  if (!skillPoints) skillPoints = 0;
  if (!stats) {
    stats = { strength: 5, dexterity: 5, intelligence: 5 };
  }

  let leveledUp = false;
  while (xp >= getXpThreshold(level)) {
    xp -= getXpThreshold(level);
    level += 1;
    skillPoints += 1;
    leveledUp = true;
  }

  await updateDoc(userRef, { level, xp, coins, skillPoints, stats });

  return { leveledUp, level, xp, coins, skillPoints, stats };
}

// Refresh the character UI using the current profile values
export async function updateCharacterUI(uid) {
  const profile = await getUserProfile(uid);
  if (!profile) return;

  const threshold = getXpThreshold(profile.level);

  if (charLevelSpan) charLevelSpan.textContent = profile.level;
  if (charXpSpan) charXpSpan.textContent = profile.xp;
  if (charXpMaxSpan) charXpMaxSpan.textContent = threshold;
  if (charCoinsSpan) charCoinsSpan.textContent = profile.coins;
  if (charPointsSpan) charPointsSpan.textContent = profile.skillPoints || 0;

  if (xpBar) {
    const pct = Math.min(100, Math.round((profile.xp / threshold) * 100));
    xpBar.style.width = pct + "%";
  }

  if (charStrSpan && charDexSpan && charIntSpan) {
    charStrSpan.textContent = profile.stats?.strength ?? 5;
    charDexSpan.textContent = profile.stats?.dexterity ?? 5;
    charIntSpan.textContent = profile.stats?.intelligence ?? 5;
  }
}

// Update the character page whenever the authenticated user changes
onAuthStateChanged(auth, user => {
  if (user && charLevelSpan) {
    updateCharacterUI(user.uid);
    setupStatButtons(user.uid);
  }
});

// Connect the stat upgrade buttons to the profile so skill points can be spent
async function setupStatButtons(uid) {
  const strBtn = document.getElementById("str-plus");
  const dexBtn = document.getElementById("dex-plus");
  const intBtn = document.getElementById("int-plus");

  if (!strBtn || !dexBtn || !intBtn) return;

  // Spend a skill point to increase the selected stat and save the new profile
  const spendPoint = async (stat) => {
    const profile = await getUserProfile(uid);
    if (!profile || profile.skillPoints <= 0) return;

    const newStats = { ...profile.stats };
    newStats[stat] += 1;

    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      stats: newStats,
      skillPoints: profile.skillPoints - 1
    });

    updateCharacterUI(uid);
  };

  strBtn.addEventListener("click", () => spendPoint("strength"));
  dexBtn.addEventListener("click", () => spendPoint("dexterity"));
  intBtn.addEventListener("click", () => spendPoint("intelligence"));
}
