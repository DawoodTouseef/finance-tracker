import { api } from "encore.dev/api";
import { CronJob } from "encore.dev/cron";
import { financeDB } from "./db";
import type { RecurringFrequency } from "./types";

// Process recurring transactions daily at 6 AM
const processRecurringTransactions = new CronJob("process-recurring", {
  title: "Process Recurring Transactions",
  schedule: "0 6 * * *", // Daily at 6 AM
  endpoint: processRecurring,
});

// Processes all active recurring transactions and creates new transactions as needed.
export const processRecurring = api<void, { processed: number; created: number }>(
  { expose: false, method: "POST", path: "/internal/process-recurring" },
  async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all active recurring transactions
    const recurringTransactions = await financeDB.queryAll<{
      id: number;
      amount: number;
      description: string;
      category_id: number;
      date: Date;
      recurring_frequency: string;
      recurring_end_date: Date | null;
      created_at: Date;
    }>`
      SELECT id, amount, description, category_id, date, recurring_frequency, recurring_end_date, created_at
      FROM transactions 
      WHERE is_recurring = true 
        AND (recurring_end_date IS NULL OR recurring_end_date >= ${today})
      ORDER BY date ASC
    `;

    let processed = 0;
    let created = 0;

    for (const transaction of recurringTransactions) {
      processed++;
      
      // Calculate next occurrence date
      const nextDate = calculateNextOccurrence(
        transaction.date,
        transaction.recurring_frequency as RecurringFrequency,
        today
      );

      if (!nextDate) continue;

      // Check if we should create a new transaction
      if (nextDate <= today) {
        // Check if transaction already exists for this date
        const existingTransaction = await financeDB.queryRow<{ id: number }>`
          SELECT id FROM transactions 
          WHERE description = ${transaction.description}
            AND category_id = ${transaction.category_id}
            AND amount = ${transaction.amount}
            AND date = ${nextDate}
            AND is_recurring = false
        `;

        if (!existingTransaction) {
          // Create new transaction
          await financeDB.exec`
            INSERT INTO transactions (amount, description, category_id, date, is_recurring)
            VALUES (${transaction.amount}, ${transaction.description}, ${transaction.category_id}, ${nextDate}, false)
          `;
          created++;
        }
      }
    }

    return { processed, created };
  }
);

function calculateNextOccurrence(
  startDate: Date,
  frequency: RecurringFrequency,
  currentDate: Date
): Date | null {
  const start = new Date(startDate);
  const current = new Date(currentDate);
  
  // If start date is in the future, return null
  if (start > current) {
    return null;
  }

  let nextDate = new Date(start);

  switch (frequency) {
    case "daily":
      // Calculate days difference and add to start date
      const daysDiff = Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      nextDate.setDate(start.getDate() + daysDiff + 1);
      break;

    case "weekly":
      // Calculate weeks difference and add to start date
      const weeksDiff = Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
      nextDate.setDate(start.getDate() + (weeksDiff + 1) * 7);
      break;

    case "monthly":
      // Add months until we get a date >= current date
      let monthsToAdd = 0;
      while (nextDate <= current) {
        monthsToAdd++;
        nextDate = new Date(start);
        nextDate.setMonth(start.getMonth() + monthsToAdd);
      }
      break;

    case "yearly":
      // Add years until we get a date >= current date
      let yearsToAdd = 0;
      while (nextDate <= current) {
        yearsToAdd++;
        nextDate = new Date(start);
        nextDate.setFullYear(start.getFullYear() + yearsToAdd);
      }
      break;

    default:
      return null;
  }

  return nextDate;
}

// Manual trigger for processing recurring transactions (for testing/admin use)
export const triggerRecurringProcess = api<void, { processed: number; created: number }>(
  { expose: true, method: "POST", path: "/recurring/process" },
  async () => {
    return await processRecurring();
  }
);
