// js/workouts.js
import { auth, onAuthStateChanged, db, collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "./firebase-config.js";
import { addReward, updateCharacterUI } from "./rewards.js";

// Input controls for adding workouts and listing them
const workoutTitleInput = document.getElementById("workout-title");
const workoutDifficultySelect = document.getElementById("workout-difficulty");
const addWorkoutBtn = document.getElementById("add-workout-btn");
const workoutError = document.getElementById("workout-error");
const workoutList = document.getElementById("workout-list");

let currentUser = null;

// Load workouts when the user signs in, otherwise show a prompt
onAuthStateChanged(auth, user => {
  currentUser = user;
  if (user) {
    loadWorkouts();
  } else if (workoutList) {
    workoutList.innerHTML = "<p>Please login to see your workouts.</p>";
  }
});

// Add a new workout entry for the current user
if (addWorkoutBtn) {
  addWorkoutBtn.addEventListener("click", async () => {
    workoutError.textContent = "";
    if (!currentUser) {
      workoutError.textContent = "You must be logged in.";
      return;
    }

    const title = workoutTitleInput.value.trim();
    const difficulty = workoutDifficultySelect.value;

    if (!title) {
      workoutError.textContent = "Workout name is required.";
      return;
    }

    try {
      const workoutsCol = collection(db, "users", currentUser.uid, "workouts");
      await addDoc(workoutsCol, {
        title,
        difficulty,
        exercises: [],
        createdAt: new Date().toISOString(),
        lastCompletedDate: null
      });
      workoutTitleInput.value = "";
      await loadWorkouts();
    } catch (err) {
      workoutError.textContent = err.message;
    }
  });
}

// Load workout documents and build the page cards
async function loadWorkouts() {
  if (!currentUser || !workoutList) return;
  workoutList.innerHTML = "Loading...";

  const workoutsCol = collection(db, "users", currentUser.uid, "workouts");
  const snapshot = await getDocs(workoutsCol);
  const workouts = [];
  snapshot.forEach(docSnap => workouts.push({ id: docSnap.id, ...docSnap.data() }));

  if (workouts.length === 0) {
    workoutList.innerHTML = "<p>No workouts yet. Add a workout to get started.</p>";
    return;
  }

  workoutList.innerHTML = "";
  workouts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  workouts.forEach(workout => {
    const card = document.createElement("div");
    card.className = "card workout-card";
    const exercises = workout.exercises || [];

    const reward = getWorkoutReward(workout);
    const completedLabel = workout.lastCompletedDate ? `Completed ${formatShortDate(workout.lastCompletedDate)}` : "Not completed yet";

    const header = document.createElement("div");
    header.className = "workout-card-header";
    header.innerHTML = `
      <div class="workout-card-title">
        <div>
          <h3>${escapeHtml(workout.title)}</h3>
          <p>${exercises.length} exercise${exercises.length === 1 ? "" : "s"} · ${formatDifficultyLabel(workout.difficulty || "medium")}</p>
        </div>
      </div>
      <div class="workout-badges">
        <span class="pill xp-pill">+${reward.xp} XP</span>
        <span class="pill coin-pill">+${reward.coins} coins</span>
      </div>
    `;

    const meta = document.createElement("div");
    meta.className = "workout-meta";
    meta.textContent = completedLabel;

    const tableContainer = document.createElement("div");
    tableContainer.className = "workout-table-container";

    if (exercises.length === 0) {
      tableContainer.innerHTML = "<p class=\"muted-text\">No exercises yet. Add one to start your routine.</p>";
    } else {
      const table = document.createElement("table");
      table.className = "workout-table";
      table.innerHTML = `
        <thead>
          <tr>
            <th>Exercise</th>
            <th>Sets</th>
            <th>Reps</th>
            <th>Weight</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${exercises.map(ex => `
            <tr>
              <td>${escapeHtml(ex.name)}</td>
              <td>${escapeHtml(ex.sets)}</td>
              <td>${escapeHtml(ex.reps)}</td>
              <td>${escapeHtml(ex.weight || "—")}</td>
              <td class="exercise-actions">
                <button class="btn small secondary" data-action="edit" data-workout="${workout.id}" data-exercise="${ex.id}">Edit</button>
                <button class="btn small danger" data-action="delete" data-workout="${workout.id}" data-exercise="${ex.id}">Delete</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      `;
      tableContainer.appendChild(table);
    }

    const actions = document.createElement("div");
    actions.className = "workout-actions";

    const addExerciseBtn = document.createElement("button");
    addExerciseBtn.textContent = "Add Exercise";
    addExerciseBtn.className = "btn small";
    addExerciseBtn.addEventListener("click", () => addExercisePrompt(workout));

    const completeBtn = document.createElement("button");
    completeBtn.textContent = "Complete Workout";
    completeBtn.className = "btn small success";
    completeBtn.addEventListener("click", () => completeWorkout(workout));

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit Workout";
    editBtn.className = "btn small secondary";
    editBtn.addEventListener("click", () => editWorkoutPrompt(workout));

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "btn small danger";
    deleteBtn.addEventListener("click", () => deleteWorkout(workout.id));

    actions.appendChild(addExerciseBtn);
    actions.appendChild(completeBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(tableContainer);
    card.appendChild(actions);
    workoutList.appendChild(card);

    attachExerciseButtons(card, workout);
  });
}

// Wire up the edit/delete buttons for each exercise in the table
function attachExerciseButtons(card, workout) {
  const buttons = card.querySelectorAll("button[data-action]");
  buttons.forEach(btn => {
    const action = btn.dataset.action;
    const workoutId = btn.dataset.workout;
    const exerciseId = btn.dataset.exercise;

    if (action === "edit") {
      btn.addEventListener("click", async () => {
        const exercise = workout.exercises.find(ex => ex.id === exerciseId);
        if (!exercise) return;
        await editExercisePrompt(workout, exercise);
      });
    }

    if (action === "delete") {
      btn.addEventListener("click", async () => {
        await deleteExercise(workout, exerciseId);
      });
    }
  });
}

// Edit the workout metadata
async function editWorkoutPrompt(workout) {
  const title = prompt("Workout name:", workout.title);
  if (title === null) return;
  const difficulty = prompt("Difficulty (easy, medium, hard):", workout.difficulty) || workout.difficulty;
  const workoutRef = doc(db, "users", currentUser.uid, "workouts", workout.id);
  await updateDoc(workoutRef, { title: title.trim() || workout.title, difficulty });
  await loadWorkouts();
}

// Permanently delete a workout document
async function deleteWorkout(workoutId) {
  if (!confirm("Delete this workout?")) return;
  const workoutRef = doc(db, "users", currentUser.uid, "workouts", workoutId);
  await deleteDoc(workoutRef);
  await loadWorkouts();
}

// Prompt the user to add a new exercise to a workout
async function addExercisePrompt(workout) {
  const name = prompt("Exercise name:", "");
  if (!name) return;
  const sets = prompt("Sets:", "3");
  if (!sets) return;
  const reps = prompt("Rep range:", "8-12");
  if (!reps) return;
  const weight = prompt("Weight (optional):", "");

  const newExercise = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim(),
    sets: sets.trim(),
    reps: reps.trim(),
    weight: weight ? weight.trim() : ""
  };

  const workoutRef = doc(db, "users", currentUser.uid, "workouts", workout.id);
  await updateDoc(workoutRef, { exercises: [...(workout.exercises || []), newExercise] });
  await loadWorkouts();
}

// Allow editing an existing exercise entry
async function editExercisePrompt(workout, exercise) {
  const name = prompt("Exercise name:", exercise.name);
  if (name === null) return;
  const sets = prompt("Sets:", exercise.sets);
  if (sets === null) return;
  const reps = prompt("Rep range:", exercise.reps);
  if (reps === null) return;
  const weight = prompt("Weight (optional):", exercise.weight || "");

  const updatedExercises = workout.exercises.map(ex => {
    if (ex.id !== exercise.id) return ex;
    return { ...ex, name: name.trim() || ex.name, sets: sets.trim() || ex.sets, reps: reps.trim() || ex.reps, weight: weight ? weight.trim() : "" };
  });

  const workoutRef = doc(db, "users", currentUser.uid, "workouts", workout.id);
  await updateDoc(workoutRef, { exercises: updatedExercises });
  await loadWorkouts();
}

// Remove a single exercise from the workout
async function deleteExercise(workout, exerciseId) {
  if (!confirm("Remove this exercise from the workout?")) return;
  const updatedExercises = workout.exercises.filter(ex => ex.id !== exerciseId);
  const workoutRef = doc(db, "users", currentUser.uid, "workouts", workout.id);
  await updateDoc(workoutRef, { exercises: updatedExercises });
  await loadWorkouts();
}

// Mark a workout as completed and award the player
async function completeWorkout(workout) {
  const today = new Date().toISOString().split("T")[0];
  if (workout.lastCompletedDate === today) {
    alert("This workout has already been completed today.");
    return;
  }

  const reward = getWorkoutReward(workout);
  const workoutRef = doc(db, "users", currentUser.uid, "workouts", workout.id);
  await updateDoc(workoutRef, { lastCompletedDate: today });

  const result = await addReward(currentUser.uid, reward.xp, reward.coins);
  await updateCharacterUI(currentUser.uid);

  alert('Workout complete!\nYou earned +' + reward.xp + ' XP and +' + reward.coins + ' coins.');
  await loadWorkouts();
}

// Calculate how much XP and coins a workout should reward based on difficulty
function getWorkoutReward(workout) {
  const exerciseBonus = (workout.exercises?.length || 0) * 5;
  let xp = 0;
  let coins = 0;

  switch (workout.difficulty) {
    case "easy":
      xp = 25 + exerciseBonus;
      coins = 8 + Math.floor(exerciseBonus / 2);
      break;
    case "medium":
      xp = 45 + exerciseBonus;
      coins = 14 + Math.floor(exerciseBonus / 2);
      break;
    case "hard":
      xp = 70 + exerciseBonus;
      coins = 24 + Math.floor(exerciseBonus / 2);
      break;
    default:
      xp = 40 + exerciseBonus;
      coins = 10 + Math.floor(exerciseBonus / 2);
  }

  return { xp, coins };
}

// Convert the difficulty value into a capitalized label for display
function formatDifficultyLabel(value) {
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}

// Return a short human-readable date label for completed workouts
function formatShortDate(dateString) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-UK", { day: "numeric", month: "short" }).format(date);
}

// Escape text before inserting it into HTML to prevent markup issues
function escapeHtml(value) {
  if (!value) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
