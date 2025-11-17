import { db } from "./db";
import { questionnaires } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

export async function cleanupOldArchivedQuestionnaires() {
  console.log("[Cleanup] Starting cleanup of old unused archived questionnaires...");
  
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const threeMonthsAgoISO = threeMonthsAgo.toISOString();

    const result = await db
      .delete(questionnaires)
      .where(
        and(
          eq(questionnaires.status, "archived"),
          eq(questionnaires.usageCount, 0),
          sql`${questionnaires.deletedAt} < ${threeMonthsAgoISO}`
        )
      )
      .returning({ id: questionnaires.id, name: questionnaires.name });

    if (result.length > 0) {
      console.log(`[Cleanup] Deleted ${result.length} old unused archived questionnaires:`);
      result.forEach((q) => {
        console.log(`  - ${q.name} (${q.id})`);
      });
    } else {
      console.log("[Cleanup] No old unused archived questionnaires to delete");
    }

    return {
      success: true,
      deletedCount: result.length,
      deletedQuestionnaires: result,
    };
  } catch (error) {
    console.error("[Cleanup] Error during cleanup:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
