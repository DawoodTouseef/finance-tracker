import { api, APIError } from "encore.dev/api";
import { financeDB } from "./db";
import type { Budget, BudgetPeriod } from "./types";

export interface CreateBudgetRequest {
  categoryId: number;
  amount: number;
  period: BudgetPeriod;
  startDate: Date;
  endDate?: Date;
}

// Creates a new budget for a category.
export const createBudget = api<CreateBudgetRequest, Budget>(
  { expose: true, method: "POST", path: "/budgets" },
  async (req) => {
    // Input validation
    if (!req.categoryId || req.categoryId <= 0) {
      throw APIError.invalidArgument("valid categoryId is required");
    }

    if (!req.amount || req.amount <= 0) {
      throw APIError.invalidArgument("amount must be greater than 0");
    }

    if (req.amount > 999999999.99) {
      throw APIError.invalidArgument("amount cannot exceed 999,999,999.99");
    }

    if (!req.period || !["monthly", "yearly"].includes(req.period)) {
      throw APIError.invalidArgument("period must be either 'monthly' or 'yearly'");
    }

    if (!req.startDate) {
      throw APIError.invalidArgument("startDate is required");
    }

    if (req.endDate && req.endDate <= req.startDate) {
      throw APIError.invalidArgument("endDate must be after startDate");
    }

    // Verify category exists and is an expense category
    const category = await financeDB.queryRow<{ id: number; type: string }>`
      SELECT id, type FROM categories WHERE id = ${req.categoryId}
    `;

    if (!category) {
      throw APIError.notFound("category not found");
    }

    if (category.type !== "expense") {
      throw APIError.invalidArgument("budgets can only be created for expense categories");
    }

    // Check for overlapping budgets for the same category
    const overlappingBudget = await financeDB.queryRow<{ id: number }>`
      SELECT id FROM budgets 
      WHERE category_id = ${req.categoryId}
        AND (
          (start_date <= ${req.startDate} AND (end_date IS NULL OR end_date >= ${req.startDate}))
          OR (start_date <= ${req.endDate || req.startDate} AND (end_date IS NULL OR end_date >= ${req.endDate || req.startDate}))
          OR (start_date >= ${req.startDate} AND (${req.endDate} IS NULL OR start_date <= ${req.endDate}))
        )
    `;

    if (overlappingBudget) {
      throw APIError.alreadyExists("a budget already exists for this category in the specified date range");
    }

    try {
      const result = await financeDB.queryRow<{
        id: number;
        category_id: number;
        amount: number;
        period: string;
        start_date: Date;
        end_date: Date | null;
        created_at: Date;
      }>`
        INSERT INTO budgets (category_id, amount, period, start_date, end_date)
        VALUES (${req.categoryId}, ${req.amount}, ${req.period}, ${req.startDate}, ${req.endDate || null})
        RETURNING id, category_id, amount, period, start_date, end_date, created_at
      `;

      if (!result) {
        throw APIError.internal("failed to create budget");
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
      throw APIError.internal("failed to create budget");
    }
  }
);
