import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { financeDB } from "./db";
import type { Transaction, RecurringFrequency } from "./types";

interface UpdateTransactionParams {
  id: number;
}

export interface UpdateTransactionRequest {
  amount?: number;
  description?: string;
  categoryId?: number;
  date?: Date;
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
  recurringEndDate?: Date;
}

// Updates an existing transaction.
export const updateTransaction = api<UpdateTransactionParams & UpdateTransactionRequest, Transaction>(
  { expose: true, method: "PUT", path: "/transactions/:id", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    if (!req.id || req.id <= 0) {
      throw APIError.invalidArgument("valid transaction id is required");
    }

    // Input validation for provided fields
    if (req.description !== undefined) {
      if (!req.description || req.description.trim().length === 0) {
        throw APIError.invalidArgument("description cannot be empty");
      }
      if (req.description.length > 255) {
        throw APIError.invalidArgument("description cannot exceed 255 characters");
      }
    }

    if (req.amount !== undefined) {
      if (req.amount <= 0) {
        throw APIError.invalidArgument("amount must be greater than 0");
      }
      if (req.amount > 999999999.99) {
        throw APIError.invalidArgument("amount cannot exceed 999,999,999.99");
      }
    }

    if (req.categoryId !== undefined && req.categoryId <= 0) {
      throw APIError.invalidArgument("valid categoryId is required");
    }

    if (req.date !== undefined) {
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      if (req.date > oneYearFromNow) {
        throw APIError.invalidArgument("date cannot be more than 1 year in the future");
      }
    }

    // Validate recurring transaction fields
    if (req.isRecurring !== undefined && req.isRecurring) {
      if (req.recurringFrequency !== undefined) {
        const validFrequencies: RecurringFrequency[] = ["daily", "weekly", "monthly", "yearly"];
        if (!validFrequencies.includes(req.recurringFrequency)) {
          throw APIError.invalidArgument("invalid recurringFrequency");
        }
      }
    }

    // Verify category exists and belongs to user if provided
    if (req.categoryId !== undefined) {
      const categoryExists = await financeDB.queryRow<{ id: number }>`
        SELECT id FROM categories WHERE id = ${req.categoryId} AND user_id = ${userId}
      `;

      if (!categoryExists) {
        throw APIError.notFound("category not found");
      }
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (req.amount !== undefined) {
      updates.push(`amount = $${paramIndex}`);
      values.push(req.amount);
      paramIndex++;
    }

    if (req.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(req.description.trim());
      paramIndex++;
    }

    if (req.categoryId !== undefined) {
      updates.push(`category_id = $${paramIndex}`);
      values.push(req.categoryId);
      paramIndex++;
    }

    if (req.date !== undefined) {
      updates.push(`date = $${paramIndex}`);
      values.push(req.date);
      paramIndex++;
    }

    if (req.isRecurring !== undefined) {
      updates.push(`is_recurring = $${paramIndex}`);
      values.push(req.isRecurring);
      paramIndex++;
    }

    if (req.recurringFrequency !== undefined) {
      updates.push(`recurring_frequency = $${paramIndex}`);
      values.push(req.recurringFrequency);
      paramIndex++;
    }

    if (req.recurringEndDate !== undefined) {
      updates.push(`recurring_end_date = $${paramIndex}`);
      values.push(req.recurringEndDate);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw APIError.invalidArgument("no fields to update");
    }

    const query = `
      UPDATE transactions 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
      RETURNING id, amount, description, category_id, date, is_recurring,
                recurring_frequency, recurring_end_date, created_at
    `;

    values.push(req.id, userId);

    try {
      const result = await financeDB.rawQueryRow<{
        id: number;
        amount: number;
        description: string;
        category_id: number;
        date: Date;
        is_recurring: boolean;
        recurring_frequency: string | null;
        recurring_end_date: Date | null;
        created_at: Date;
      }>(query, ...values);

      if (!result) {
        throw APIError.notFound("transaction not found");
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
      throw APIError.internal("failed to update transaction");
    }
  }
);
