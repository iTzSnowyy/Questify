// js/ui.js
import { auth, onAuthStateChanged, signOut } from "./firebase-config.js";

const userEmailSpan = document.getElementById("user-email");
const logoutBtn = document.getElementById("logout-btn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "index.html";
  });
}

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
