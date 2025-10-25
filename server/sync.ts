import { storage } from "./storage";
import type { InsertNutritionLog, InsertWorkoutLog, InsertCheckIn } from "@shared/schema";

interface SyncOptions {
  clientId: string;
  clientName: string;
  daysToSync?: number;
}

// Simulates Apple Health data sync by generating realistic health data
export async function syncAppleHealthData(options: SyncOptions) {
  const { clientId, clientName, daysToSync = 7 } = options;
  
  const today = new Date();
  const syncedData = {
    nutritionLogs: [] as InsertNutritionLog[],
    workoutLogs: [] as InsertWorkoutLog[],
    checkIns: [] as InsertCheckIn[],
  };

  // Generate data for the past N days
  for (let i = 0; i < daysToSync; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Generate nutrition log (realistic Apple Health / MyFitnessPal style data)
    const caloriesBase = 1800 + Math.random() * 600; // 1800-2400
    const nutritionLog: InsertNutritionLog = {
      clientId,
      clientName,
      date: dateStr,
      calories: Math.round(caloriesBase * 10) / 10,
      protein: Math.round((caloriesBase * (0.25 + Math.random() * 0.1) / 4) * 10) / 10, // 25-35% protein
      carbs: Math.round((caloriesBase * (0.40 + Math.random() * 0.1) / 4) * 10) / 10, // 40-50% carbs
      fats: Math.round((caloriesBase * (0.25 + Math.random() * 0.1) / 9) * 10) / 10, // 25-35% fats
      notes: "Synced from Apple Health",
      dataSource: "apple_health",
    };
    syncedData.nutritionLogs.push(nutritionLog);

    // Generate 1-2 workout logs per day (varying types)
    const workoutsPerDay = Math.random() > 0.3 ? 1 : 2;
    for (let j = 0; j < workoutsPerDay; j++) {
      const workoutTypes = [
        { type: "Running", durationRange: [20, 45], intensity: ["Moderate", "High"] },
        { type: "Strength Training", durationRange: [30, 60], intensity: ["Moderate", "High"] },
        { type: "Cycling", durationRange: [30, 60], intensity: ["Moderate", "High"] },
        { type: "Walking", durationRange: [30, 90], intensity: ["Low", "Moderate"] },
        { type: "HIIT", durationRange: [20, 30], intensity: ["High"] },
        { type: "Yoga", durationRange: [30, 60], intensity: ["Low", "Moderate"] },
      ];
      
      const workout = workoutTypes[Math.floor(Math.random() * workoutTypes.length)];
      const duration = Math.floor(
        workout.durationRange[0] + 
        Math.random() * (workout.durationRange[1] - workout.durationRange[0])
      );
      
      const workoutLog: InsertWorkoutLog = {
        clientId,
        clientName,
        date: dateStr,
        workoutType: workout.type,
        duration,
        intensity: workout.intensity[Math.floor(Math.random() * workout.intensity.length)],
        exercises: workout.type === "Strength Training" 
          ? ["Squats", "Bench Press", "Deadlifts", "Rows", "Shoulder Press"]
          : null,
        notes: "Synced from Apple Health",
        dataSource: "apple_health",
      };
      syncedData.workoutLogs.push(workoutLog);
    }

    // Generate check-in every 3-4 days
    if (i % 3 === 0 || i === 0) {
      const baseWeight = 175; // Base weight
      const weightVariation = (Math.random() - 0.5) * 2; // +/- 1 lb variation
      const baseBodyFat = 18; // Base body fat %
      const bodyFatVariation = (Math.random() - 0.5) * 0.6; // +/- 0.3% variation

      const checkIn: InsertCheckIn = {
        clientId,
        clientName,
        date: dateStr,
        weight: Math.round((baseWeight + weightVariation) * 10) / 10,
        bodyFat: Math.round((baseBodyFat + bodyFatVariation) * 10) / 10,
        measurements: null,
        photos: null,
        mood: ["Excellent", "Good", "Fair"][Math.floor(Math.random() * 3)],
        energy: ["High", "Moderate", "Low"][Math.floor(Math.random() * 3)],
        notes: "Auto-synced from Apple Health",
        dataSource: "apple_health",
      };
      syncedData.checkIns.push(checkIn);
    }
  }

  // Save all synced data to database
  const results = {
    nutritionLogsCreated: 0,
    workoutLogsCreated: 0,
    checkInsCreated: 0,
  };

  for (const nutritionLog of syncedData.nutritionLogs) {
    await storage.createNutritionLog(nutritionLog);
    results.nutritionLogsCreated++;
  }

  for (const workoutLog of syncedData.workoutLogs) {
    await storage.createWorkoutLog(workoutLog);
    results.workoutLogsCreated++;
  }

  for (const checkIn of syncedData.checkIns) {
    await storage.createCheckIn(checkIn);
    results.checkInsCreated++;
  }

  return results;
}
