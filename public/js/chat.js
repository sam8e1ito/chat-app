import { auth, db } from "./firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js";
import { ref, push, onValue, serverTimestamp, remove, child, update } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-database.js";

const messagesRef = ref(db, "messages");
const form = document.getElementById("messageForm");
const input = document.getElementById("messageInput");
const messagesDiv = document.getElementById("messages");
const logoutBtn = document.getElementById("logoutBtn");

// helpers for day separators
const isSameDay = (d1, d2) => {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
};

const formatDayLabel = (date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";
  // localized long date
  return date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
};

const createDaySeparator = (date) => {
  const separator = document.createElement("div");
  separator.classList.add("day-separator");
  separator.textContent = formatDayLabel(date);
  return separator;
};

const getNumericTime = (msg) => {
  if (!msg) return 0;
  if (typeof msg.ts === "number") return msg.ts;
  if (typeof msg.timestamp === "number") return msg.timestamp;
  if (typeof msg.date === "string") return new Date(msg.date).getTime();
  if (typeof msg.timestamp === "string") return new Date(msg.timestamp).getTime();
  return 0;
};

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    // load messages
    onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      messagesDiv.innerHTML = "";
      if (data) {
        let currentDay = null;

        // Keep IDs for deletion and sort chronologically
        const messages = Object.entries(data)
          .map(([id, msg]) => ({ id, ...msg }))
          .sort((a, b) => getNumericTime(a) - getNumericTime(b));

        messages.forEach((msg) => {
          const numeric = getNumericTime(msg);
          const timestamp = new Date(numeric || Date.now());
          const msgDayKey = timestamp.toDateString();

          if (currentDay !== msgDayKey) {
            const sep = createDaySeparator(timestamp);
            messagesDiv.appendChild(sep);
            currentDay = msgDayKey;
          }

          const div = document.createElement("div");
          div.classList.add("message");
          
          // Check if message is deleted
          const isDeleted = msg.deleted === true;
          
          // Align to the right if message belongs to the current user
          if (msg.uid && msg.uid === auth.currentUser.uid) {
            div.classList.add("own");
          }

          const options = { hour: "2-digit", minute: "2-digit" };
          const timeLabel =
            typeof msg.ts === "number" || typeof msg.timestamp === "number"
              ? timestamp.toLocaleString(undefined, options)
              : timestamp.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

          // Build DOM safely (no innerHTML for user content)
          const userEl = document.createElement("div");
          userEl.className = "username";
          userEl.textContent = `${msg.user || "Unknown"}:`;

          const textEl = document.createElement("div");
          textEl.className = "text";
          
          // Show deleted message or actual message
          if (isDeleted) {
            textEl.textContent = `deleted the message`;
            textEl.classList.add("deleted-text");
            div.classList.add("deleted-message");
          } else {
            textEl.textContent = msg.text || "";
          }

          const tsEl = document.createElement("div");
          tsEl.className = "timestamp";
          tsEl.textContent = timeLabel;

          div.appendChild(userEl);
          div.appendChild(textEl);
          div.appendChild(tsEl);

          // Only show delete button for owner and if message is not already deleted
          if (msg.uid && msg.uid === auth.currentUser.uid && !isDeleted) {
            const btn = document.createElement("button");
            btn.classList.add("delete-btn");
            btn.textContent = "Delete";
            btn.addEventListener("click", async () => {
              try {
                // Update message to mark as deleted instead of removing it
                await update(child(messagesRef, msg.id), {
                  deleted: true
                });
              } catch (err) {
                console.error("Failed to delete message:", err);
                alert("Could not delete message.");
              }
            });
            div.appendChild(btn);
          }

          messagesDiv.appendChild(div);
        });
      }
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
  }
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const val = input.value.trim();
  if (val === "") return;

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // yyyy-mm-dd

  const user = auth.currentUser;
  if (!user) return;

  // Get username from email by taking everything before the @
  const username = (user.email || "").split("@")[0] || "user";

  // Include uid to enforce ownership and rule checks
  const message = {
    text: val,
    user: username,
    uid: user.uid,
    date: dateStr,
    timestamp: serverTimestamp(),
    deleted: false
  };

  push(messagesRef, message).catch((err) => {
    console.error("Failed to send message:", err);
    alert("Failed to send message.");
  });
  input.value = "";
});

logoutBtn.addEventListener("click", () => signOut(auth));