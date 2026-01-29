// js/auth.js
import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "./firebase-config.js";
import { initUserProfile } from "./rewards.js";

const regEmail = document.getElementById("reg-email");
const regPassword = document.getElementById("reg-password");
const regBtn = document.getElementById("register-btn");
const regError = document.getElementById("reg-error");

const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");

if (regBtn) {
  regBtn.addEventListener("click", async () => {
    regError.textContent = "";
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        regEmail.value,
        regPassword.value
      );
      await initUserProfile(cred.user.uid, cred.user.email);
      window.location.href = "home.html";
    } catch (err) {
      regError.textContent = err.message;
    }
  });
}

if (loginBtn) {
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
