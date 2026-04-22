// js/auth.js
import { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "./firebase-config.js";
import { initUserProfile } from "./rewards.js";

// Registration elements
const regEmail = document.getElementById("reg-email");
const regPassword = document.getElementById("reg-password");
const regBtn = document.getElementById("register-btn");
const regError = document.getElementById("reg-error");

// Login elements
const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");

// Handle user registration and profile initialization
if (regBtn) {
  // Register the user and create a starter profile document
  regBtn.addEventListener("click", async () => {
    regError.textContent = "";
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        regEmail.value,
        regPassword.value
      );
      await initUserProfile(cred.user.uid, cred.user.email);

      window.location.href = "character-setup.html";
    } catch (err) {
      regError.textContent = err.message;
    }
  });
}

// Handle existing user login and redirect to the app
if (loginBtn) {
  // Sign the user in and take them to the main app home page
  loginBtn.addEventListener("click", async () => {
    loginError.textContent = "";
    try {
      await signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value);
      window.location.href = "home.html";
    } catch (err) {
      loginError.textContent = err.message;
    }
  });
}