import { api, APIError } from "encore.dev/api";
import { financeDB } from "./db";
import type { FinancialGoal } from "./types";

interface UpdateGoalParams {
  id: number;
}

export interface UpdateGoalRequest {
  name?: string;
  targetAmount?: number;
  currentAmount?: number;
  targetDate?: Date;
  description?: string;
}

// Updates a financial goal.
export const updateGoal = api<UpdateGoalParams & UpdateGoalRequest, FinancialGoal>(
  { expose: true, method: "PUT", path: "/goals/:id" },
  async (req) => {
    if (!req.id || req.id <= 0) {
      throw APIError.invalidArgument("valid goal id is required");
    }

    // Input validation for provided fields
    if (req.name !== undefined) {
      if (!req.name || req.name.trim().length === 0) {
        throw APIError.invalidArgument("name cannot be empty");
      }
      if (req.name.length > 255) {
        throw APIError.invalidArgument("name cannot exceed 255 characters");
      }
    }

    if (req.targetAmount !== undefined) {
      if (req.targetAmount <= 0) {
        throw APIError.invalidArgument("targetAmount must be greater than 0");
      }
      if (req.targetAmount > 999999999.99) {
        throw APIError.invalidArgument("targetAmount cannot exceed 999,999,999.99");
      }
    }

    if (req.currentAmount !== undefined) {
      if (req.currentAmount < 0) {
        throw APIError.invalidArgument("currentAmount cannot be negative");
      }
      if (req.currentAmount > 999999999.99) {
        throw APIError.invalidArgument("currentAmount cannot exceed 999,999,999.99");
      }
    }

    if (req.targetDate !== undefined) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (req.targetDate < today) {
        throw APIError.invalidArgument("targetDate cannot be in the past");
      }

      const fiftyYearsFromNow = new Date();
      fiftyYearsFromNow.setFullYear(fiftyYearsFromNow.getFullYear() + 50);
      if (req.targetDate > fiftyYearsFromNow) {
        throw APIError.invalidArgument("targetDate cannot be more than 50 years in the future");
      }
    }

    if (req.description !== undefined && req.description.length > 1000) {
      throw APIError.invalidArgument("description cannot exceed 1000 characters");
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (req.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(req.name.trim());
      paramIndex++;
    }

    if (req.targetAmount !== undefined) {
      updates.push(`target_amount = $${paramIndex}`);
      values.push(req.targetAmount);
      paramIndex++;
    }

    if (req.currentAmount !== undefined) {
      updates.push(`current_amount = $${paramIndex}`);
      values.push(req.currentAmount);
      paramIndex++;
    }

    if (req.targetDate !== undefined) {
      updates.push(`target_date = $${paramIndex}`);
      values.push(req.targetDate);
      paramIndex++;
    }

    if (req.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(req.description?.trim() || null);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw APIError.invalidArgument("no fields to update");
    }

    const query = `
      UPDATE financial_goals 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, target_amount, current_amount, target_date, description, created_at
    `;

    values.push(req.id);

    try {
      const result = await financeDB.rawQueryRow<{
        id: number;
        name: string;
        target_amount: number;
        current_amount: number;
        target_date: Date | null;
        description: string | null;
        created_at: Date;
      }>(query, ...values);

      if (!result) {
        throw APIError.notFound("goal not found");
      }

      return {
        id: result.id,
        name: result.name,
        targetAmount: result.target_amount,
        currentAmount: result.current_amount,
        targetDate: result.target_date || undefined,
        description: result.description || undefined,
        createdAt: result.created_at,
      };
    } catch (err: any) {
      throw APIError.internal("failed to update goal");
    }
  }
);
