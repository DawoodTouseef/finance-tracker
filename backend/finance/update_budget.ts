import { api, APIError } from "encore.dev/api";
import { financeDB } from "./db";
import type { Budget, BudgetPeriod } from "./types";

interface UpdateBudgetParams {
  id: number;
}

export interface UpdateBudgetRequest {
  categoryId?: number;
  amount?: number;
  period?: BudgetPeriod;
  startDate?: Date;
  endDate?: Date;
}

// Updates an existing budget.
export const updateBudget = api<UpdateBudgetParams & UpdateBudgetRequest, Budget>(
  { expose: true, method: "PUT", path: "/budgets/:id" },
  async (req) => {
    if (!req.id || req.id <= 0) {
      throw APIError.invalidArgument("valid budget id is required");
    }

    // Input validation for provided fields
    if (req.categoryId !== undefined && req.categoryId <= 0) {
      throw APIError.invalidArgument("valid categoryId is required");
    }

    if (req.amount !== undefined) {
      if (req.amount <= 0) {
        throw APIError.invalidArgument("amount must be greater than 0");
      }
      if (req.amount > 999999999.99) {
        throw APIError.invalidArgument("amount cannot exceed 999,999,999.99");
      }
    }

    if (req.period !== undefined && !["monthly", "yearly"].includes(req.period)) {
      throw APIError.invalidArgument("period must be either 'monthly' or 'yearly'");
    }

    // Verify category exists and is an expense category if provided
    if (req.categoryId !== undefined) {
      const category = await financeDB.queryRow<{ id: number; type: string }>`
        SELECT id, type FROM categories WHERE id = ${req.categoryId}
      `;

      if (!category) {
        throw APIError.notFound("category not found");
      }

      if (category.type !== "expense") {
        throw APIError.invalidArgument("budgets can only be created for expense categories");
      }
    }

    // Get current budget to validate date changes
    const currentBudget = await financeDB.queryRow<{
      category_id: number;
      start_date: Date;
      end_date: Date | null;
    }>`
      SELECT category_id, start_date, end_date FROM budgets WHERE id = ${req.id}
    `;

    if (!currentBudget) {
      throw APIError.notFound("budget not found");
    }

    // Validate date range if dates are being updated
    const newStartDate = req.startDate || currentBudget.start_date;
    const newEndDate = req.endDate !== undefined ? req.endDate : currentBudget.end_date;
    const newCategoryId = req.categoryId || currentBudget.category_id;

    if (newEndDate && newEndDate <= newStartDate) {
      throw APIError.invalidArgument("endDate must be after startDate");
    }

    // Check for overlapping budgets if category or dates are changing
    if (req.categoryId !== undefined || req.startDate !== undefined || req.endDate !== undefined) {
      const overlappingBudget = await financeDB.queryRow<{ id: number }>`
        SELECT id FROM budgets 
        WHERE category_id = ${newCategoryId}
          AND id != ${req.id}
          AND (
            (start_date <= ${newStartDate} AND (end_date IS NULL OR end_date >= ${newStartDate}))
            OR (start_date <= ${newEndDate || newStartDate} AND (end_date IS NULL OR end_date >= ${newEndDate || newStartDate}))
            OR (start_date >= ${newStartDate} AND (${newEndDate} IS NULL OR start_date <= ${newEndDate}))
          )
      `;

      if (overlappingBudget) {
        throw APIError.alreadyExists("a budget already exists for this category in the specified date range");
      }
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (req.categoryId !== undefined) {
      updates.push(`category_id = $${paramIndex}`);
      values.push(req.categoryId);
      paramIndex++;
    }

    if (req.amount !== undefined) {
      updates.push(`amount = $${paramIndex}`);
      values.push(req.amount);
      paramIndex++;
    }

    if (req.period !== undefined) {
      updates.push(`period = $${paramIndex}`);
      values.push(req.period);
      paramIndex++;
    }

    if (req.startDate !== undefined) {
      updates.push(`start_date = $${paramIndex}`);
      values.push(req.startDate);
      paramIndex++;
    }

    if (req.endDate !== undefined) {
      updates.push(`end_date = $${paramIndex}`);
      values.push(req.endDate);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw APIError.invalidArgument("no fields to update");
    }

    const query = `
      UPDATE budgets 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, category_id, amount, period, start_date, end_date, created_at
    `;

    values.push(req.id);

    try {
      const result = await financeDB.rawQueryRow<{
        id: number;
        category_id: number;
        amount: number;
        period: string;
        start_date: Date;
        end_date: Date | null;
        created_at: Date;
      }>(query, ...values);

      if (!result) {
        throw APIError.notFound("budget not found");
      }

      return {
        id: result.id,
        categoryId: result.category_id,
        amount: result.amount,
        period: result.period as BudgetPeriod,
        startDate: result.start_date,
        endDate: result.end_date || undefined,
        createdAt: result.created_at,
      };
    } catch (err: any) {
      if (err.code === "23503") { // foreign key violation
        throw APIError.notFound("category not found");
      }
      throw APIError.internal("failed to update budget");
    }
  }
);
