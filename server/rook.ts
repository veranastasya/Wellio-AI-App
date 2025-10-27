import crypto from "crypto";
import type { Request } from "express";
import type { InsertNutritionLog, InsertWorkoutLog, InsertCheckIn } from "@shared/schema";

// ROOK webhook event types
interface RookWebhookEvent {
  type: "NUTRITION" | "PHYSICAL" | "BODY" | "SLEEP";
  user_id: string;
  data: any;
  timestamp: string;
}

/**
 * Verify ROOK webhook signature using HMAC SHA-256
 */
export function verifyRookWebhook(req: Request & { rawBody?: string }): boolean {
  const receivedHash = req.headers['x-rook-hash'];
  
  if (!receivedHash || typeof receivedHash !== 'string') {
    console.error('[ROOK] Missing X-ROOK-HASH header');
    return false;
  }

  const secretKey = process.env.ROOK_SECRET_KEY;
  if (!secretKey) {
    console.error('[ROOK] ROOK_SECRET_KEY not configured');
    return false;
  }

  // Use raw body for HMAC verification (ROOK signs the raw payload)
  const payload = req.rawBody;
  if (!payload) {
    console.error('[ROOK] No raw body available for verification');
    return false;
  }

  // Generate HMAC signature from raw request body
  const hmac = crypto.createHmac('sha256', secretKey);
  hmac.update(payload);
  const calculatedHash = hmac.digest();

  // Use timing-safe comparison with proper hex encoding
  try {
    const receivedBuffer = Buffer.from(receivedHash, 'hex');
    const isValid = crypto.timingSafeEqual(receivedBuffer, calculatedHash);
    
    if (!isValid) {
      console.error('[ROOK] Signature mismatch - received:', receivedHash, 'calculated:', calculatedHash.toString('hex'));
    }
    
    return isValid;
  } catch (error) {
    console.error('[ROOK] HMAC verification error:', error);
    return false;
  }
}

/**
 * Map ROOK nutrition data to Wellio nutrition log format
 */
export function mapRookNutritionToLog(
  event: RookWebhookEvent,
  clientId: string,
  clientName: string
): InsertNutritionLog | null {
  try {
    const { data } = event;
    
    // ROOK nutrition data structure
    const nutritionData = data.nutrition_summary || data;
    const metadata = data.metadata || {};
    
    return {
      date: metadata.start_date || event.timestamp.split('T')[0],
      clientId,
      clientName,
      calories: nutritionData.calories_data?.net_intake_kcal || null,
      protein: nutritionData.macros_data?.protein_g || null,
      carbs: nutritionData.macros_data?.carbs_g || null,
      fats: nutritionData.macros_data?.fat_g || null,
      notes: `Synced from ROOK on ${new Date().toLocaleDateString()}`,
      dataSource: "rook",
    };
  } catch (error) {
    console.error('Failed to map ROOK nutrition data:', error);
    return null;
  }
}

/**
 * Map ROOK physical/activity data to Wellio workout log format
 */
export function mapRookPhysicalToWorkout(
  event: RookWebhookEvent,
  clientId: string,
  clientName: string
): InsertWorkoutLog | null {
  try {
    const { data } = event;
    
    // ROOK physical activity data structure
    const activityData = data.physical_summary || data;
    const metadata = data.metadata || {};
    
    // Determine workout type from activities
    const activities = activityData.activities || [];
    const primaryActivity = activities[0];
    const workoutType = primaryActivity?.name || "General Activity";
    
    // Calculate total duration in minutes
    const durationSeconds = activityData.active_durations_data?.activity_seconds || 0;
    const duration = Math.round(durationSeconds / 60);
    
    // Determine intensity based on heart rate or activity level
    let intensity = "moderate";
    const avgHeartRate = activityData.heart_rate_data?.avg_hr_bpm;
    if (avgHeartRate) {
      if (avgHeartRate > 150) intensity = "high";
      else if (avgHeartRate < 120) intensity = "low";
    }
    
    return {
      date: metadata.start_date || event.timestamp.split('T')[0],
      clientId,
      clientName,
      workoutType,
      duration: duration || null,
      intensity,
      notes: `Synced from ROOK - ${activities.length} activities recorded`,
      dataSource: "rook",
      exercises: activities.length > 0 ? activities : undefined,
    };
  } catch (error) {
    console.error('Failed to map ROOK physical data:', error);
    return null;
  }
}

/**
 * Map ROOK body data to Wellio check-in format
 */
export function mapRookBodyToCheckIn(
  event: RookWebhookEvent,
  clientId: string,
  clientName: string
): InsertCheckIn | null {
  try {
    const { data } = event;
    
    // ROOK body measurement data structure
    const bodyData = data.body_summary || data;
    const metadata = data.metadata || {};
    
    // Extract measurements
    const weightKg = bodyData.weight_data?.weight_kg;
    const weightLbs = weightKg ? weightKg * 2.20462 : null;
    
    const bodyFatPercentage = bodyData.body_composition_data?.body_fat_percentage;
    
    // Energy level mapping (ROOK uses various scales)
    let energy = "average";
    const hrv = bodyData.heart_rate_data?.hrv_rmssd_ms;
    if (hrv) {
      if (hrv > 60) energy = "high";
      else if (hrv < 30) energy = "low";
    }
    
    return {
      date: metadata.start_date || event.timestamp.split('T')[0],
      clientId,
      clientName,
      weight: weightLbs,
      bodyFat: bodyFatPercentage,
      measurements: null,
      photos: null,
      mood: null,
      energy,
      notes: `Synced from ROOK`,
      dataSource: "rook",
    };
  } catch (error) {
    console.error('Failed to map ROOK body data:', error);
    return null;
  }
}

/**
 * Generate ROOK connection URL for a user
 * 
 * ROOK offers two environments:
 * - Sandbox (testing): https://connect-sandbox.tryrook.io
 * - Production: https://connect.tryrook.io
 * 
 * For API-based sources (Garmin, Fitbit, Oura, etc.), users simply visit
 * the connections page and authorize their devices. No user binding needed.
 */
export function generateRookConnectionUrl(userId: string, redirectUrl?: string): string {
  const clientUuid = process.env.ROOK_CLIENT_UUID;
  const environment = process.env.ROOK_ENVIRONMENT || 'sandbox'; // 'sandbox' or 'production'
  
  // Choose base URL based on environment
  const baseUrl = environment === 'production' 
    ? 'https://connect.tryrook.io' 
    : 'https://connect-sandbox.tryrook.io';
  
  const params = new URLSearchParams({
    client_uuid: clientUuid || '',
    user_id: userId,
  });
  
  // Add redirect URL if provided
  if (redirectUrl) {
    params.append('redirect_url', redirectUrl);
  }
  
  const connectionUrl = `${baseUrl}?${params.toString()}`;
  console.log(`[ROOK] Generated connection URL for userId=${userId} environment=${environment}`);
  
  return connectionUrl;
}
