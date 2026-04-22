// js/habits.js
import { auth, onAuthStateChanged, db, collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "./firebase-config.js";
import { addReward, updateCharacterUI } from "./rewards.js";

const habitNameInput = document.getElementById("habit-name");
const habitCategoryInput = document.getElementById("habit-category");
const habitFrequencySelect = document.getElementById("habit-frequency");
const habitDifficultySelect = document.getElementById("habit-difficulty");
const addHabitBtn = document.getElementById("add-habit-btn");
const habitError = document.getElementById("habit-error");
const habitList = document.getElementById("habit-list");

let currentUser = null;

// Watch authentication and load habits when the user signs in
onAuthStateChanged(auth, user => {
  currentUser = user;
  if (user) {
    loadHabits();
  } else if (habitList) {
    habitList.innerHTML = "";
  }
});

// Add a new habit document when the button is clicked
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

// Load habits and show completion data and streaks
async function loadHabits() {
  if (!currentUser || !habitList) return;
  habitList.innerHTML = "Loading...";

  try {
    const habitsCol = collection(db, "users", currentUser.uid, "habits");
    const habitsSnap = await getDocs(habitsCol);
    const habits = [];
    habitsSnap.forEach(docSnap => {
      habits.push({ id: docSnap.id, ...docSnap.data() });
    });

    const completionsCol = collection(db, "users", currentUser.uid, "completions");
    const completionsSnap = await getDocs(completionsCol);
    const completions = [];
    completionsSnap.forEach(docSnap => {
      completions.push({ id: docSnap.id, ...docSnap.data() });
    });

    if (habits.length === 0) {
      habitList.innerHTML = "<li>No habits yet.</li>";
      return;
    }

    habitList.innerHTML = "";
    habits.forEach(habit => {
      const habitCompletions = completions.filter(c => c.habitId === habit.id);
      const streak = computeStreak(habitCompletions, habit.frequency);

      const li = document.createElement("li");
      li.className = "habit-item";

      const info = document.createElement("div");
      info.innerHTML = `<strong>${habit.title}</strong> (${habit.category || "No category"}) - ${habit.frequency} - ${habit.difficulty}`;

      const meta = document.createElement("div");
      meta.className = "habit-meta";
      const streakLabel = habit.frequency === "weekly" ? "week" : "day";
      meta.innerHTML = `
        <span>Streak: <strong>${streak}</strong> ${streakLabel}${streak === 1 ? "" : "s"}</span>
      `;

      const actions = document.createElement("div");
      actions.className = "habit-actions";

      const completeBtn = document.createElement("button");
      completeBtn.textContent = "Complete";
      completeBtn.className = "btn small success";
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
      li.appendChild(meta);
      li.appendChild(actions);
      habitList.appendChild(li);
    });
  } catch (err) {
    habitList.innerHTML = `<li>Error loading habits: ${err.message}</li>`;
  }
}

// Return the Monday key for the week containing the provided date
function getWeekStartKey(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split("T")[0];
}

// Get today's date as a local date string (YYYY-MM-DD format)
function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Compute streak based on consecutive completion days or weeks
// Daily: Streak resets to 0 if today or yesterday has no completion
// Weekly: Streak resets to 0 if current week or previous week has no completion
function computeStreak(completions, frequency = "daily") {
  if (!completions.length) return 0;

  if (frequency === "weekly") {
    return computeWeeklyStreak(completions);
  } else {
    return computeDailyStreak(completions);
  }
}

// Count consecutive weeks with completions
function computeWeeklyStreak(completions) {
  const uniqueWeeks = Array.from(
    new Set(completions.map(c => {
      const [year, month, day] = c.date.split("-");
      const date = new Date(year, parseInt(month) - 1, parseInt(day));
      return getWeekStartKey(date);
    }))
  ).sort();

  if (!uniqueWeeks.length) return 0;

  const today = new Date();
  const currentWeekKey = getWeekStartKey(today);
  const prevWeekDate = new Date(today);
  prevWeekDate.setDate(prevWeekDate.getDate() - 7);
  const prevWeekKey = getWeekStartKey(prevWeekDate);

  // If no completion in current week or previous week, streak is 0
  if (!uniqueWeeks.includes(currentWeekKey) && !uniqueWeeks.includes(prevWeekKey)) {
    return 0;
  }

  // Count backwards through consecutive weeks
  let streak = 0;
  let currentWeek = new Date(today);
  currentWeek.setHours(0, 0, 0, 0);

  while (true) {
    const weekKey = getWeekStartKey(currentWeek);
    if (uniqueWeeks.includes(weekKey)) {
      streak += 1;
      currentWeek.setDate(currentWeek.getDate() - 7);
    } else {
      break;
    }
  }

  return streak;
}

// Count consecutive days with completions
function computeDailyStreak(completions) {
  const uniqueDays = Array.from(new Set(completions.map(c => c.date))).sort();
  if (!uniqueDays.length) return 0;

  const todayKey = getTodayKey();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, "0");
  const day = String(yesterday.getDate()).padStart(2, "0");
  const yesterdayKey = `${year}-${month}-${day}`;

  // If no completion today or yesterday, streak is 0 (day was missed)
  if (!uniqueDays.includes(todayKey) && !uniqueDays.includes(yesterdayKey)) {
    return 0;
  }

  // Start counting from the most recent completion date
  const mostRecentDateStr = uniqueDays[uniqueDays.length - 1];
  const [year2, month2, day2] = mostRecentDateStr.split("-");
  let currentDate = new Date(year2, parseInt(month2) - 1, parseInt(day2));
  currentDate.setHours(0, 0, 0, 0);

  // Count backwards through consecutive completion dates
  let streak = 0;
  while (true) {
    const dateYear = currentDate.getFullYear();
    const dateMonth = String(currentDate.getMonth() + 1).padStart(2, "0");
    const dateDay = String(currentDate.getDate()).padStart(2, "0");
    const dateKey = `${dateYear}-${dateMonth}-${dateDay}`;
    
    if (uniqueDays.includes(dateKey)) {
      streak += 1;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// Return the most recent completion date as a short label
function getLastCompletionDate(completions) {
  if (!completions.length) return null;
  const dates = completions.map(c => c.date).sort();
  const latestDateStr = dates[dates.length - 1];
  const [year, month, day] = latestDateStr.split("-");
  const date = new Date(year, parseInt(month) - 1, parseInt(day));
  return new Intl.DateTimeFormat("en-UK", { day: "numeric" , month: "short" }).format(date);
}

// Prompt the user to edit a habit and save the updated document
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

// Confirm and delete a habit from the user's list
async function deleteHabit(id) {
  if (!confirm("Delete this habit?")) return;
  const habitRef = doc(db, "users", auth.currentUser.uid, "habits", id);
  await deleteDoc(habitRef);
  await loadHabits();
}

// Complete a habit for the current user and award XP/coins based on difficulty
async function completeHabit(habit) {
  if (!currentUser) return;

  const completionsCol = collection(db, "users", currentUser.uid, "completions");
  const snap = await getDocs(completionsCol);

  const todayKey = getTodayKey();
  const currentWeekKey = getWeekStartKey(new Date());
  let alreadyCompletedToday = false;
  let alreadyCompletedThisWeek = false;

  snap.forEach(docSnap => {
    const data = docSnap.data();
    if (data.habitId !== habit.id) return;

    const completionDate = data.date;
    if (completionDate === todayKey) {
      alreadyCompletedToday = true;
    }

    if (habit.frequency === "weekly") {
      const completionWeek = getWeekStartKey(new Date(data.date));
      if (completionWeek === currentWeekKey) {
        alreadyCompletedThisWeek = true;
      }
    }
  });

  if (habit.frequency === "weekly" && alreadyCompletedThisWeek) {
    alert('You have already completed "' + habit.title + '" this week.');
    return;
  }

  if (habit.frequency !== "weekly" && alreadyCompletedToday) {
    alert('You have already completed "' + habit.title + '" today.');
    return;
  }

  const mood = prompt("Mood (1-5):");
  const energy = prompt("Energy (1-5):");

  const moodVal = parseInt(mood, 10);
  const energyVal = parseInt(energy, 10);

  if (
    isNaN(moodVal) || isNaN(energyVal) ||
    moodVal < 1 || moodVal > 5 ||
    energyVal < 1 || energyVal > 5
  ) {
    alert("Mood and energy must be numbers from 1 to 5.");
    return;
  }

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

  await addDoc(completionsCol, {
    habitId: habit.id,
    title: habit.title,
    date: getTodayKey(),
    mood: moodVal,
    energy: energyVal,
    difficulty: habit.difficulty
  });

  await updateHabitStreak(habit.id);

  const result = await addReward(currentUser.uid, XP_GAIN, COIN_GAIN);
  await updateCharacterUI(currentUser.uid);

  alert('Completed "' + habit.title + '"!\nYou earned +' + XP_GAIN + ' XP and +' + COIN_GAIN + ' coins.');
  await loadHabits();
}

// Record and refresh the streak data for a habit after completion
async function updateHabitStreak(habitId) {
  const completionsCol = collection(db, "users", currentUser.uid, "completions");
  const snap = await getDocs(completionsCol);
  const dates = [];

  snap.forEach(docSnap => {
    const data = docSnap.data();
    if (data.habitId === habitId) {
      dates.push(data.date.split("T")[0]);
    }
  });

  const uniqueDates = Array.from(new Set(dates)).sort();
  const streak = computeStreak(uniqueDates.map(date => ({ date })));
  const lastCompleted = uniqueDates.length ? uniqueDates[uniqueDates.length - 1] : null;
  const habitRef = doc(db, "users", currentUser.uid, "habits", habitId);

  await updateDoc(habitRef, {
    lastCompletedDate: lastCompleted,
    streak
  });
}
