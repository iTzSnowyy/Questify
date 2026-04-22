// js/ui.js
import { auth, onAuthStateChanged, signOut } from "./firebase-config.js";

// Highlight the current page in the site navigation
const currentPage = window.location.pathname.split('/').pop();
const navLinks = document.querySelectorAll('.nav a');
navLinks.forEach(link => {
  const href = link.getAttribute('href');
  if (href === currentPage) {
    link.classList.add('active');
  }
});

const userEmailSpan = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");

// Handle logout action when the user clicks the logout button
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
}

// Redirect unauthenticated users away from main pages
onAuthStateChanged(auth, user => {
  if (user) {
    if (userEmailSpan) userEmailSpan.textContent = user.email;
  } else {
    const path = window.location.pathname;
    const page = path.split("/").pop();
    if (page !== "index.html" && page !== "") {
      window.location.href = "index.html";
    }
  }
});
