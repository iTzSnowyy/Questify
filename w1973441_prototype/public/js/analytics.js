// js/analytics.js
import { auth, onAuthStateChanged, db, collection, getDocs } from "./firebase-config.js";

// DOM references for analytics cards and charts
const habitsCompletedSpan = document.getElementById("habits-completed");
const streakTrackingSpan = document.getElementById("streak-tracking");
const workoutsCompletedSpan = document.getElementById("workouts-completed");
const avgMoodSpan = document.getElementById("avg-mood");
const avgEnergySpan = document.getElementById("avg-energy");
const totalCompletionsSpan = document.getElementById("total-completions");
const topHabitSpan = document.getElementById("top-habit");
const habitChartEl = document.getElementById("habit-chart");
const chartLegendEl = document.getElementById("chart-legend");
const coachMessageP = document.getElementById("coach-message");

let currentUser = null;

// Keep analytics synced with the current authentication state
onAuthStateChanged(auth, async user => {
  currentUser = user;
  if (user) {
    await loadAnalytics();
  } else {
    if (coachMessageP) coachMessageP.textContent = "Please log in to see your analytics.";
  }
});

// Load analytics data from Firestore, compute metrics, and update the dashboard UI
async function loadAnalytics() {
  const now = new Date();

  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - 6);

  const currentWeekStart = getWeekStart(now);
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekEnd.getDate() + 6);
  currentWeekEnd.setHours(23, 59, 59, 999);

  const completionsCol = collection(db, "users", currentUser.uid, "completions");
  const completionsSnap = await getDocs(completionsCol);

  const workoutsCol = collection(db, "users", currentUser.uid, "workouts");
  const workoutsSnap = await getDocs(workoutsCol);

  let total = 0;
  let moodSum = 0;
  let energySum = 0;

  const habitCounts = {};
  const uniqueCompletionDays = new Set();
  const dayBuckets = buildLastSevenDays(now);

  completionsSnap.forEach(docSnap => {
    const data = docSnap.data();
    const date = parseDateValue(data.date);
    if (!date) return;

    const bucketKey = formatDateKey(date);
    uniqueCompletionDays.add(bucketKey);

    if (date >= startDate && date <= endDate) {
      total++;
      moodSum += data.mood || 0;
      energySum += data.energy || 0;

      const title = data.title || "Unknown habit";
      habitCounts[title] = (habitCounts[title] || 0) + 1;
    }

    if (dayBuckets[bucketKey]) {
      dayBuckets[bucketKey].count += 1;
    }
  });

  const workoutsThisWeek = countCurrentWeekWorkouts(
    workoutsSnap.docs.map(docSnap => docSnap.data()),
    currentWeekStart,
    currentWeekEnd
  );

  const currentStreak = computeOverallStreak(Array.from(uniqueCompletionDays));

  // UI updates
  if (habitsCompletedSpan) habitsCompletedSpan.textContent = total.toString();
  if (streakTrackingSpan) streakTrackingSpan.textContent = `${currentStreak} day${currentStreak === 1 ? "" : "s"}`;
  if (workoutsCompletedSpan) workoutsCompletedSpan.textContent = workoutsThisWeek.toString();

  if (total === 0) {
    if (avgMoodSpan) avgMoodSpan.textContent = "N/A";
    if (avgEnergySpan) avgEnergySpan.textContent = "N/A";
    if (totalCompletionsSpan) totalCompletionsSpan.textContent = "0";
    if (topHabitSpan) topHabitSpan.textContent = "N/A";

    renderHabitChart(Object.values(dayBuckets), habitCounts);

    if (coachMessageP) {
      coachMessageP.textContent =
        "You haven't completed any habits this week. Start small — one easy task today can build momentum.";
    }
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

  renderHabitChart(Object.values(dayBuckets), habitCounts);

  let message = "";

  if (currentStreak >= 5) {
    message = "Amazing streak! You're building strong consistency — consider adding a slightly harder habit.";
  }

  else if (currentStreak > 0 && currentStreak < 3) {
    message = "You've started a streak — keep it going by completing at least one task today.";
  }

  else if (avgMood < 3 && avgEnergy < 3) {
    message = "Your mood and energy seem low. Focus on simple, low-effort habits to rebuild consistency.";
  }

  else if (avgMood >= 4 && avgEnergy >= 4) {
    message = "You're feeling great — this is a perfect time to challenge yourself with more difficult tasks.";
  }

  else if (workoutsThisWeek === 0) {
    message = "You haven't logged any workouts this week. Try adding a short session to boost your energy.";
  }

  else if (total >= 5) {
    message = "Nice consistency this week. Keep building on this progress!";
  }

  else {
    message = "You're making progress. Stay consistent and your habits will improve over time.";
  }

  if (coachMessageP) coachMessageP.textContent = message;
}

// Build a day bucket for the last seven calendar days, including today
function buildLastSevenDays(now) {
  const days = {};
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    days[formatDateKey(date)] = { date, count: 0 };
  }
  return days;
}

// Calculate the starting Monday of the week for a given date
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Count workouts completed during the current week window
function countCurrentWeekWorkouts(workouts, weekStart, weekEnd) {
  return workouts.reduce((count, workout) => {
    const completedAt = parseDateValue(workout.lastCompletedDate);
    if (!completedAt) return count;
    if (completedAt >= weekStart && completedAt <= weekEnd) {
      return count + 1;
    }
    return count;
  }, 0);
}

// Compute how many consecutive days the user has completed habits
function computeOverallStreak(uniqueDayKeys) {
  if (!uniqueDayKeys.length) return 0;

  const dateSet = new Set(uniqueDayKeys);
  let streak = 0;

  let current = new Date();
  current.setHours(0, 0, 0, 0);

  while (true) {
    const key = formatDateKey(current);
    if (dateSet.has(key)) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else break;
  }

  return streak;
}

// Parse a Firestore or string date value into a JavaScript Date object
function parseDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value;

  if (typeof value === "string") {
    const parsed = parseLocalDateString(value);
    if (parsed) return parsed;
  }

  if (typeof value === "object" && value.toDate) {
    return value.toDate();
  }

  const fallback = new Date(value);
  return isNaN(fallback.getTime()) ? null : fallback;
}

// Normalize different date formats into a Date object
function parseLocalDateString(value) {
  const iso = value.split("T")[0];
  const parts = iso.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

// Format a date as YYYY-MM-DD so the chart buckets remain consistent
function formatDateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Draw the weekly habit chart and update the chart legend
function renderHabitChart(dayBuckets, habitCounts) {
  if (!habitChartEl || !chartLegendEl) return;

  habitChartEl.innerHTML = "";
  chartLegendEl.innerHTML = "";

  // Sort dayBuckets to ensure Monday is always on the left and Sunday on the right
  const sortedBuckets = dayBuckets.sort((a, b) => {
    const dateA = a.date;
    const dateB = b.date;
    
    // Get the day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
    const dayA = dateA.getDay();
    const dayB = dateB.getDay();
    
    // Convert to Monday = 0, Tuesday = 1, ..., Sunday = 6
    const adjustedDayA = dayA === 0 ? 6 : dayA - 1;
    const adjustedDayB = dayB === 0 ? 6 : dayB - 1;
    
    // If both days are in the same week, sort by adjusted day
    if (adjustedDayA !== adjustedDayB) {
      return adjustedDayA - adjustedDayB;
    }
    
    // If same day of week, sort by date (earlier date first)
    return dateA - dateB;
  });

  const maxCount = Math.max(...sortedBuckets.map(day => day.count), 1);

  sortedBuckets.forEach(day => {
    const barWrapper = document.createElement("div");
    barWrapper.className = "habit-bar";

    const barInner = document.createElement("div");
    barInner.className = "habit-bar-inner";

    const height = Math.max(8, Math.round((day.count / maxCount) * 100));
    barInner.style.height = `${height}%`;
    barInner.textContent = day.count > 0 ? day.count : "";

    const label = document.createElement("div");
    label.className = "habit-bar-label";
    label.textContent = new Intl.DateTimeFormat("en-UK", { weekday: "short" }).format(day.date);

    barWrapper.appendChild(barInner);
    barWrapper.appendChild(label);
    habitChartEl.appendChild(barWrapper);
  });

  const topHabits = Object.entries(habitCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  topHabits.forEach(([title, count], index) => {
    const legendItem = document.createElement("div");
    legendItem.className = "legend-item";
    legendItem.innerHTML = `
      ${title}: ${count}
    `;
    chartLegendEl.appendChild(legendItem);
  });
}
