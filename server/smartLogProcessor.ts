import OpenAI from "openai";
import { storage } from "./storage";
import type { 
  SmartLog, 
  AIClassification, 
  AIParsedData, 
  InsertProgressEvent,
  ProgressEventType,
  ParsedNutrition,
  ParsedWorkout,
  ParsedWeight,
  ParsedSteps,
  ParsedSleep,
  ParsedMood
} from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CLASSIFICATION_PROMPT = `You are an AI that classifies wellness/fitness log entries. Analyze the text and identify what types of data it contains.

Return a JSON object with this exact structure:
{
  "detected_event_types": ["weight", "nutrition", "workout", "steps", "sleep", "checkin_mood", "note", "other"],
  "has_weight": boolean,
  "has_nutrition": boolean,
  "has_workout": boolean,
  "has_steps": boolean,
  "has_sleep": boolean,
  "has_mood": boolean,
  "overall_confidence": number (0.0 to 1.0)
}

Only include event types that are actually mentioned. Be conservative - if something is ambiguous, set has_* to false.

Examples:
- "Weighed in at 165 lbs today" -> has_weight: true
- "Had a chicken salad for lunch, about 400 calories" -> has_nutrition: true
- "Did a 30 min leg workout" -> has_workout: true
- "10k steps today!" -> has_steps: true
- "Slept 7 hours last night" -> has_sleep: true
- "Feeling great today, energy is 8/10" -> has_mood: true

Text to classify:`;

const PARSING_PROMPT = `You are an AI that extracts structured wellness/fitness data from text. Extract specific values where mentioned.

Return a JSON object with only the fields that have data:
{
  "nutrition": {
    "calories": number or null,
    "calories_est": number if estimated,
    "protein_g": number or null,
    "protein_est_g": number if estimated,
    "carbs_g": number or null,
    "carbs_est_g": number if estimated,
    "fat_g": number or null,
    "fat_est_g": number if estimated,
    "source": "logged" | "estimated",
    "estimated": boolean,
    "confidence": 0.0 to 1.0
  },
  "workout": {
    "type": "strength" | "cardio" | "hiit" | "mobility" | "mixed" | "unknown",
    "body_focus": ["upper", "lower", "full", "core", "unspecified"],
    "duration_min": number or null,
    "intensity": "low" | "medium" | "high" | "unknown",
    "notes": string,
    "confidence": 0.0 to 1.0
  },
  "weight": {
    "value": number,
    "unit": "kg" | "lbs",
    "confidence": 0.0 to 1.0
  },
  "steps": {
    "steps": number,
    "source": "manual" | "device",
    "confidence": 0.0 to 1.0
  },
  "sleep": {
    "hours": number,
    "quality": "poor" | "fair" | "good" | "excellent" or null,
    "confidence": 0.0 to 1.0
  },
  "mood": {
    "rating": 1-10,
    "notes": string or null,
    "confidence": 0.0 to 1.0
  }
}

Only include fields that are explicitly mentioned or can be reasonably inferred. Set confidence lower for inferred values.

Text to parse:`;

export async function classifySmartLog(text: string): Promise<AIClassification> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: CLASSIFICATION_PROMPT
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const classification = JSON.parse(content) as AIClassification;
    return classification;
  } catch (error) {
    console.error("Error classifying smart log:", error);
    return {
      detected_event_types: ["note"],
      has_weight: false,
      has_nutrition: false,
      has_workout: false,
      has_steps: false,
      has_sleep: false,
      has_mood: false,
      overall_confidence: 0.5
    };
  }
}

export async function parseSmartLog(text: string, classification: AIClassification): Promise<AIParsedData> {
  try {
    if (classification.overall_confidence < 0.3 || 
        (!classification.has_weight && !classification.has_nutrition && 
         !classification.has_workout && !classification.has_steps && 
         !classification.has_sleep && !classification.has_mood)) {
      return {};
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: PARSING_PROMPT
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(content) as AIParsedData;
    return parsed;
  } catch (error) {
    console.error("Error parsing smart log:", error);
    return {};
  }
}

export async function processSmartLogToEvents(
  smartLog: SmartLog,
  parsedData: AIParsedData
): Promise<InsertProgressEvent[]> {
  const events: InsertProgressEvent[] = [];
  const { clientId, localDateForClient, id: smartLogId } = smartLog;

  if (parsedData.weight) {
    events.push({
      clientId,
      smartLogId,
      eventType: "weight" as ProgressEventType,
      dateForMetric: localDateForClient,
      dataJson: {
        value: parsedData.weight.value,
        unit: parsedData.weight.unit,
        value_kg: parsedData.weight.unit === "kg" 
          ? parsedData.weight.value 
          : parsedData.weight.value * 0.453592
      },
      confidence: parsedData.weight.confidence,
      needsReview: parsedData.weight.confidence < 0.8
    });
  }

  if (parsedData.nutrition) {
    events.push({
      clientId,
      smartLogId,
      eventType: "nutrition" as ProgressEventType,
      dateForMetric: localDateForClient,
      dataJson: {
        calories: parsedData.nutrition.calories || parsedData.nutrition.calories_est,
        calories_estimated: !!parsedData.nutrition.calories_est,
        protein_g: parsedData.nutrition.protein_g || parsedData.nutrition.protein_est_g,
        protein_estimated: !!parsedData.nutrition.protein_est_g,
        carbs_g: parsedData.nutrition.carbs_g || parsedData.nutrition.carbs_est_g,
        carbs_estimated: !!parsedData.nutrition.carbs_est_g,
        fat_g: parsedData.nutrition.fat_g || parsedData.nutrition.fat_est_g,
        fat_estimated: !!parsedData.nutrition.fat_est_g,
        source: parsedData.nutrition.source,
        estimated: parsedData.nutrition.estimated
      },
      confidence: parsedData.nutrition.confidence,
      needsReview: parsedData.nutrition.confidence < 0.7
    });
  }

  if (parsedData.workout) {
    events.push({
      clientId,
      smartLogId,
      eventType: "workout" as ProgressEventType,
      dateForMetric: localDateForClient,
      dataJson: {
        type: parsedData.workout.type,
        body_focus: parsedData.workout.body_focus,
        duration_min: parsedData.workout.duration_min,
        intensity: parsedData.workout.intensity,
        notes: parsedData.workout.notes
      },
      confidence: parsedData.workout.confidence,
      needsReview: parsedData.workout.confidence < 0.7
    });
  }

  if (parsedData.steps) {
    events.push({
      clientId,
      smartLogId,
      eventType: "steps" as ProgressEventType,
      dateForMetric: localDateForClient,
      dataJson: {
        steps: parsedData.steps.steps,
        source: parsedData.steps.source
      },
      confidence: parsedData.steps.confidence,
      needsReview: parsedData.steps.confidence < 0.8
    });
  }

  if (parsedData.sleep) {
    events.push({
      clientId,
      smartLogId,
      eventType: "sleep" as ProgressEventType,
      dateForMetric: localDateForClient,
      dataJson: {
        hours: parsedData.sleep.hours,
        quality: parsedData.sleep.quality
      },
      confidence: parsedData.sleep.confidence,
      needsReview: parsedData.sleep.confidence < 0.7
    });
  }

  if (parsedData.mood) {
    events.push({
      clientId,
      smartLogId,
      eventType: "checkin_mood" as ProgressEventType,
      dateForMetric: localDateForClient,
      dataJson: {
        rating: parsedData.mood.rating,
        notes: parsedData.mood.notes
      },
      confidence: parsedData.mood.confidence,
      needsReview: parsedData.mood.confidence < 0.7
    });
  }

  return events;
}

export async function processSmartLog(smartLogId: string): Promise<{
  success: boolean;
  classification?: AIClassification;
  parsed?: AIParsedData;
  eventsCreated?: number;
  error?: string;
}> {
  try {
    const smartLog = await storage.getSmartLog(smartLogId);
    if (!smartLog) {
      return { success: false, error: "Smart log not found" };
    }

    if (!smartLog.rawText) {
      await storage.updateSmartLog(smartLogId, {
        processingStatus: "completed",
        aiClassificationJson: null,
        aiParsedJson: null
      });
      return { success: true, eventsCreated: 0 };
    }

    await storage.updateSmartLog(smartLogId, {
      processingStatus: "processing"
    });

    const classification = await classifySmartLog(smartLog.rawText);
    
    await storage.updateSmartLog(smartLogId, {
      aiClassificationJson: classification
    });

    const parsed = await parseSmartLog(smartLog.rawText, classification);
    
    await storage.updateSmartLog(smartLogId, {
      aiParsedJson: parsed
    });

    const updatedLog = await storage.getSmartLog(smartLogId);
    if (!updatedLog) {
      return { success: false, error: "Smart log not found after update" };
    }

    const eventInserts = await processSmartLogToEvents(updatedLog, parsed);
    
    let eventsCreated = 0;
    for (const eventData of eventInserts) {
      await storage.createProgressEvent(eventData);
      eventsCreated++;
    }

    await storage.updateSmartLog(smartLogId, {
      processingStatus: "completed"
    });

    return { 
      success: true, 
      classification, 
      parsed, 
      eventsCreated 
    };
  } catch (error) {
    console.error("Error processing smart log:", error);
    
    await storage.updateSmartLog(smartLogId, {
      processingStatus: "failed",
      processingError: error instanceof Error ? error.message : "Unknown error"
    });

    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}
