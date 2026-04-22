// js/character-setup.js
import { auth, onAuthStateChanged, db, doc, updateDoc, getDoc } from "./firebase-config.js";
import { AVATARS, getStatValues } from "./avatars.js";

// DOM refs
const usernameInput = document.getElementById("username-input");
const avatarFrame = document.getElementById("avatar-frame");
const avatarImg = document.getElementById("avatar-img");
const avatarSvg = document.getElementById("avatar-svg-fallback");
const avatarNameEl = document.getElementById("avatar-name");
const avatarClassEl = document.getElementById("avatar-class");
const statPillsEl = document.getElementById("stat-pills");
const dotsEl = document.getElementById("dots");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const confirmBtn = document.getElementById("confirm-btn");
const setupError = document.getElementById("setup-error");

let currentIndex = 0;
let currentUser  = null;

// Carousel rendering 
function renderAvatar(idx) {
  const a = AVATARS[idx];

  // Show the avatar image and populate fallback content
  avatarImg.style.display = "block";
  avatarSvg.style.display = "none";
  avatarImg.src = a.imageSrc;
  avatarSvg.innerHTML = a.svgFallback;

  avatarFrame.style.borderColor = a.accentColour;
  avatarNameEl.textContent = a.name;
  avatarClassEl.textContent = a.cls;

  statPillsEl.innerHTML = a.stats
    .map(s => `<span class="stat-pill">${s}</span>`)
    .join("");

  // Build carousel dots and wire up click events
  dotsEl.innerHTML = AVATARS
    .map((_, i) => `<div class="dot${i === idx ? " active" : ""}" data-idx="${i}"></div>`)
    .join("");

  dotsEl.querySelectorAll(".dot").forEach(dot => {
    dot.addEventListener("click", () => {
      currentIndex = parseInt(dot.dataset.idx, 10);
      renderAvatar(currentIndex);
    });
  });
}

prevBtn.addEventListener("click", () => {
  currentIndex = (currentIndex - 1 + AVATARS.length) % AVATARS.length;
  renderAvatar(currentIndex);
});

nextBtn.addEventListener("click", () => {
  currentIndex = (currentIndex + 1) % AVATARS.length;
  renderAvatar(currentIndex);
});

// Auth guard
onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
  } else {
    // If the user is not authenticated, send them back to the landing page
    window.location.href = "index.html";
  }
});

// Confirm / Save
confirmBtn.addEventListener("click", async () => {
  setupError.textContent = "";

  const username = usernameInput.value.trim();
  if (!username) {
    setupError.textContent = "Please enter a username.";
    return;
  }
  if (username.length < 3) {
    setupError.textContent = "Username must be at least 3 characters.";
    return;
  }
  if (!currentUser) {
    setupError.textContent = "Not logged in. Please go back and register again.";
    return;
  }

  const chosen = AVATARS[currentIndex];

  try {
    confirmBtn.textContent = "Saving...";
    confirmBtn.disabled = true;

    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, {
      username: username,
      avatarId: chosen.id,
      avatarName: chosen.name,
      avatarClass: chosen.cls
    });

    // Persist avatar-linked stats after the profile update
    const profileSnap = await getDoc(userRef);
    if (profileSnap.exists()) {
      const statValues = getStatValues(chosen);
      await updateDoc(userRef, { stats: statValues });
    }

    window.location.href = "home.html";
  } catch (err) {
    setupError.textContent = err.message;
    confirmBtn.textContent = "Begin Your Quest →";
    confirmBtn.disabled = false;
  }
});

renderAvatar(0);