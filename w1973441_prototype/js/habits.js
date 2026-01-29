// js/habits.js
import {
  auth,
  onAuthStateChanged,
  db,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc
} from "./firebase-config.js";
import { addReward, updateCharacterUI } from "./rewards.js";

const habitNameInput = document.getElementById("habit-name");
const habitCategoryInput = document.getElementById("habit-category");
const habitFrequencySelect = document.getElementById("habit-frequency");
const habitDifficultySelect = document.getElementById("habit-difficulty");
const addHabitBtn = document.getElementById("add-habit-btn");
const habitError = document.getElementById("habit-error");
const habitList = document.getElementById("habit-list");

let currentUser = null;

onAuthStateChanged(auth, user => {
  currentUser = user;
  if (user) {
    loadHabits();
  } else if (habitList) {
    habitList.innerHTML = "";
  }
});

if (addHabitBtn) {
  addHabitBtn.addEventListener("click", async () => {
    habitError.textContent = "";
    if (!currentUser) {
      habitError.textContent = "You must be logged in.";
      return;
    }
    const name = habitNameInput.value.trim();
    const category = habitCategoryInput.value.trim();
    const frequency = habitFrequencySelect.value;
    const difficulty = habitDifficultySelect.value;

    if (!name) {
      habitError.textContent = "Habit name is required.";
      return;
    }

    try {
      const habitsCol = collection(db, "users", currentUser.uid, "habits");
      await addDoc(habitsCol, {
        title: name,
        category,
        frequency,
        difficulty
      });
      habitNameInput.value = "";
      habitCategoryInput.value = "";
      await loadHabits();
    } catch (err) {
      habitError.textContent = err.message;
    }
  });
}

async function loadHabits() {
  if (!currentUser || !habitList) return;
  habitList.innerHTML = "Loading...";

  const habitsCol = collection(db, "users", currentUser.uid, "habits");
  const snap = await getDocs(habitsCol);
  const items = [];
  snap.forEach(docSnap => {
    items.push({ id: docSnap.id, ...docSnap.data() });
  });

  if (items.length === 0) {
    habitList.innerHTML = "<li>No habits yet.</li>";
    return;
  }

  habitList.innerHTML = "";
  items.forEach(habit => {
    const li = document.createElement("li");
    li.className = "habit-item";

    const info = document.createElement("div");
    info.innerHTML = `<strong>${habit.title}</strong> (${habit.category || "No category"}) - ${habit.frequency} - ${habit.difficulty}`;

    const actions = document.createElement("div");
    actions.className = "habit-actions";

    const completeBtn = document.createElement("button");
    completeBtn.textContent = "Complete";
    completeBtn.className = "btn small";
    completeBtn.addEventListener("click", () => completeHabit(habit));

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.className = "btn small secondary";
    editBtn.addEventListener("click", () => editHabitPrompt(habit));

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "btn small danger";
    deleteBtn.addEventListener("click", () => deleteHabit(habit.id));

    actions.appendChild(completeBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    li.appendChild(info);
    li.appendChild(actions);
    habitList.appendChild(li);
  });
}

async function editHabitPrompt(habit) {
  const newName = prompt("Edit habit name:", habit.title);
  if (newName === null) return;
  const newCategory = prompt("Edit category:", habit.category || "");
  const newFrequency = prompt("Edit frequency (daily/weekly):", habit.frequency);
  const newDifficulty = prompt("Edit difficulty (easy/medium/hard):", habit.difficulty);

  const habitRef = doc(db, "users", auth.currentUser.uid, "habits", habit.id);
  await updateDoc(habitRef, {
    title: newName || habit.title,
    category: newCategory || habit.category,
    frequency: newFrequency || habit.frequency,
    difficulty: newDifficulty || habit.difficulty
  });
  await loadHabits();
}

async function deleteHabit(id) {
  if (!confirm("Delete this habit?")) return;
  const habitRef = doc(db, "users", auth.currentUser.uid, "habits", id);
  await deleteDoc(habitRef);
  await loadHabits();
}

async function completeHabit(habit) {
  if (!currentUser) return;

  // Prevent completing the same habit more than once per day
  const completionsCol = collection(db, "users", currentUser.uid, "completions");
  const snap = await getDocs(completionsCol);

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  let alreadyCompleted = false;

  snap.forEach(docSnap => {
    const data = docSnap.data();
    const completionDate = data.date.split("T")[0];
    if (data.habitId === habit.id && completionDate === today) {
      alreadyCompleted = true;
    }
  });

  if (alreadyCompleted) {
    alert(`You have already completed "${habit.title}" today.`);
    return;
  }

  // Mood + energy input
  const mood = prompt("Mood (1-5):");
  const energy = prompt("Energy (1-5):");

  const moodVal = parseInt(mood, 10);
  const energyVal = parseInt(energy, 10);

  if (
    isNaN(moodVal) || isNaN(energyVal) ||
    moodVal < 1 || moodVal > 5 ||
    energyVal < 1 || energyVal > 5
  ) {
    alert("Invalid mood/energy. Please enter values between 1 and 5.");
    return;
  }

  // Difficulty rewards
  let XP_GAIN = 0;
  let COIN_GAIN = 0;

  switch (habit.difficulty) {
    case "easy":
      XP_GAIN = 10;
      COIN_GAIN = 2;
      break;
    case "medium":
      XP_GAIN = 20;
      COIN_GAIN = 5;
      break;
    case "hard":
      XP_GAIN = 40;
      COIN_GAIN = 10;
      break;
    default:
      XP_GAIN = 20;
      COIN_GAIN = 5;
  }

  // Save completion
  await addDoc(completionsCol, {
    habitId: habit.id,
    title: habit.title,
    date: new Date().toISOString(),
    mood: moodVal,
    energy: energyVal,
    difficulty: habit.difficulty
  });

  const result = await addReward(currentUser.uid, XP_GAIN, COIN_GAIN);
  await updateCharacterUI(currentUser.uid);

  let msg = `Completed "${habit.title}"! +${XP_GAIN} XP, +${COIN_GAIN} coins.`;
  if (result?.leveledUp) {
    msg += `\nYou leveled up to level ${result.level}! Skill points: ${result.skillPoints}`;
  }
  alert(msg);
}
