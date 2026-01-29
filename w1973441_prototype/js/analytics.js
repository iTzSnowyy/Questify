// js/analytics.js
import {
  auth,
  onAuthStateChanged,
  db,
  collection,
  getDocs
} from "./firebase-config.js";

const avgMoodSpan = document.getElementById("avg-mood");
const avgEnergySpan = document.getElementById("avg-energy");
const totalCompletionsSpan = document.getElementById("total-completions");
const topHabitSpan = document.getElementById("top-habit");
const coachMessageP = document.getElementById("coach-message");

let currentUser = null;

onAuthStateChanged(auth, async user => {
  currentUser = user;
  if (user) {
    await loadAnalytics();
  } else {
    if (coachMessageP) coachMessageP.textContent = "Please log in to see your analytics.";
  }
});

async function loadAnalytics() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const completionsCol = collection(db, "users", currentUser.uid, "completions");
  const snap = await getDocs(completionsCol);

  let total = 0;
  let moodSum = 0;
  let energySum = 0;
  const habitCounts = {};

  snap.forEach(docSnap => {
    const data = docSnap.data();
    const date = new Date(data.date);
    if (date >= sevenDaysAgo && date <= now) {
      total++;
      moodSum += data.mood || 0;
      energySum += data.energy || 0;
      const title = data.title || "Unknown habit";
      habitCounts[title] = (habitCounts[title] || 0) + 1;
    }
  });

  if (total === 0) {
    if (avgMoodSpan) avgMoodSpan.textContent = "N/A";
    if (avgEnergySpan) avgEnergySpan.textContent = "N/A";
    if (totalCompletionsSpan) totalCompletionsSpan.textContent = "0";
    if (topHabitSpan) topHabitSpan.textContent = "N/A";
    if (coachMessageP) coachMessageP.textContent = "No completions in the last 7 days yet. Try completing a habit today to start your streak!";
    return;
  }

  const avgMood = (moodSum / total).toFixed(1);
  const avgEnergy = (energySum / total).toFixed(1);

  if (avgMoodSpan) avgMoodSpan.textContent = avgMood;
  if (avgEnergySpan) avgEnergySpan.textContent = avgEnergy;
  if (totalCompletionsSpan) totalCompletionsSpan.textContent = total.toString();

  let topHabit = "N/A";
  let maxCount = 0;
  for (const [title, count] of Object.entries(habitCounts)) {
    if (count > maxCount) {
      maxCount = count;
      topHabit = title;
    }
  }
  if (topHabitSpan) topHabitSpan.textContent = topHabit;

  let message = "";
  if (avgMood >= 4 && avgEnergy >= 4) {
    message = "You've been feeling great and energetic lately. This is a perfect time to tackle a harder habit!";
  } else if (avgMood < 3 && avgEnergy < 3) {
    message = "Your mood and energy seem low. Try focusing on one small, easy habit to rebuild momentum.";
  } else if (total >= 5) {
    message = "Nice consistency over the last week. Keep building on this streak!";
  } else {
    message = "You're getting started. A few more completions and you'll see clear patterns in your habits.";
  }

  if (coachMessageP) coachMessageP.textContent = message;
}
