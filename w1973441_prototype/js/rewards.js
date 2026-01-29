// js/rewards.js
import { db, doc, setDoc, getDoc, updateDoc } from "./firebase-config.js";
import { auth, onAuthStateChanged } from "./firebase-config.js";

const charLevelSpan = document.getElementById("char-level");
const charXpSpan = document.getElementById("char-xp");
const charXpMaxSpan = document.getElementById("char-xp-max");
const xpBar = document.getElementById("xp-bar");
const charCoinsSpan = document.getElementById("char-coins");
const charPointsSpan = document.getElementById("char-points");
const charStrSpan = document.getElementById("char-str");
const charDexSpan = document.getElementById("char-dex");
const charIntSpan = document.getElementById("char-int");

// XP needed for each level: 100 + (level - 1) * 50
export function getXpThreshold(level) {
  return 100 + (level - 1) * 50;
}

export async function initUserProfile(uid, email) {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, {
    email,
    level: 1,
    xp: 0,
    coins: 0,
    skillPoints: 0,
    stats: {
      strength: 5,
      dexterity: 5,
      intelligence: 5
    }
  });
}

export async function getUserProfile(uid) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) return snap.data();
  return null;
}

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

// Auto-update on character page
onAuthStateChanged(auth, user => {
  if (user && charLevelSpan) {
    updateCharacterUI(user.uid);
  }
});
