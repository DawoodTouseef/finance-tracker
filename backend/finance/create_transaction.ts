import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { financeDB } from "./db";
import type { Transaction, RecurringFrequency } from "./types";

export interface CreateTransactionRequest {
  amount: number;
  description: string;
  categoryId: number;
  date: Date;
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
  recurringEndDate?: Date;
}

// Creates a new financial transaction.
export const createTransaction = api<CreateTransactionRequest, Transaction>(
  { expose: true, method: "POST", path: "/transactions", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    // Input validation
    if (!req.description || req.description.trim().length === 0) {
      throw APIError.invalidArgument("description is required and cannot be empty");
    }

    if (req.description.length > 255) {
      throw APIError.invalidArgument("description cannot exceed 255 characters");
    }

    if (!req.amount || req.amount <= 0) {
      throw APIError.invalidArgument("amount must be greater than 0");
    }

    if (req.amount > 999999999.99) {
      throw APIError.invalidArgument("amount cannot exceed 999,999,999.99");
    }

    if (!req.categoryId || req.categoryId <= 0) {
      throw APIError.invalidArgument("valid categoryId is required");
    }

    if (!req.date) {
      throw APIError.invalidArgument("date is required");
    }

    // Validate date is not too far in the future (1 year)
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    if (req.date > oneYearFromNow) {
      throw APIError.invalidArgument("date cannot be more than 1 year in the future");
    }

    // Validate recurring transaction fields
    if (req.isRecurring) {
      if (!req.recurringFrequency) {
        throw APIError.invalidArgument("recurringFrequency is required for recurring transactions");
      }

      const validFrequencies: RecurringFrequency[] = ["daily", "weekly", "monthly", "yearly"];
      if (!validFrequencies.includes(req.recurringFrequency)) {
        throw APIError.invalidArgument("invalid recurringFrequency");
      }

      if (req.recurringEndDate && req.recurringEndDate <= req.date) {
        throw APIError.invalidArgument("recurringEndDate must be after the transaction date");
      }
    }

    // Verify category exists and belongs to user
    const categoryExists = await financeDB.queryRow<{ id: number }>`
      SELECT id FROM categories WHERE id = ${req.categoryId} AND user_id = ${userId}
    `;

    if (!categoryExists) {
      throw APIError.notFound("category not found");
    }

    try {
      const result = await financeDB.queryRow<{
        id: number;
        amount: number;
        description: string;
        category_id: number;
        date: Date;
        is_recurring: boolean;
        recurring_frequency: string | null;
        recurring_end_date: Date | null;
        created_at: Date;
      }>`
        INSERT INTO transactions (
          amount, description, category_id, date, is_recurring, 
          recurring_frequency, recurring_end_date, user_id
        )
        VALUES (
          ${req.amount}, ${req.description.trim()}, ${req.categoryId}, ${req.date},
          ${req.isRecurring || false}, ${req.recurringFrequency || null}, 
          ${req.recurringEndDate || null}, ${userId}
        )
        RETURNING id, amount, description, category_id, date, is_recurring,
                  recurring_frequency, recurring_end_date, created_at
      `;

      if (!result) {
        throw APIError.internal("failed to create transaction");
      }

      return {
        id: result.id,
        amount: result.amount,
        description: result.description,
        categoryId: result.category_id,
        date: result.date,
        isRecurring: result.is_recurring,
        recurringFrequency: result.recurring_frequency as RecurringFrequency | undefined,
        recurringEndDate: result.recurring_end_date || undefined,
        createdAt: result.created_at,
      };
    } catch (err: any) {
      if (err.code === "23503") { // foreign key violation
        throw APIError.notFound("category not found");
      }
      throw err;
    }
  }
);
