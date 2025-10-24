import { auth } from './firebase-init.js';
import { signInWithEmailAndPassword, onAuthStateChanged } 
from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";

const loginForm = document.getElementById("loginForm");
const errorMessage = document.getElementById("errorMessage");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  
  try {
    errorMessage.textContent = ""; // Clear any previous errors
    await signInWithEmailAndPassword(auth, email, password);
    // Successful login will trigger onAuthStateChanged
  } catch (error) {
    console.error("Login error:", error);
    errorMessage.textContent = "Invalid email or password";
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    window.location.href = "index.html";
  }
});