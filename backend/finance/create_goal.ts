import { api, APIError } from "encore.dev/api";
import { financeDB } from "./db";
import type { FinancialGoal } from "./types";

export interface CreateGoalRequest {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate?: Date;
  description?: string;
}

// Creates a new financial goal.
export const createGoal = api<CreateGoalRequest, FinancialGoal>(
  { expose: true, method: "POST", path: "/goals" },
  async (req) => {
    // Input validation
    if (!req.name || req.name.trim().length === 0) {
      throw APIError.invalidArgument("name is required and cannot be empty");
    }

    if (req.name.length > 255) {
      throw APIError.invalidArgument("name cannot exceed 255 characters");
    }

    if (!req.targetAmount || req.targetAmount <= 0) {
      throw APIError.invalidArgument("targetAmount must be greater than 0");
    }

    if (req.targetAmount > 999999999.99) {
      throw APIError.invalidArgument("targetAmount cannot exceed 999,999,999.99");
    }

    if (req.currentAmount !== undefined) {
      if (req.currentAmount < 0) {
        throw APIError.invalidArgument("currentAmount cannot be negative");
      }

      if (req.currentAmount > 999999999.99) {
        throw APIError.invalidArgument("currentAmount cannot exceed 999,999,999.99");
      }
    }

    if (req.targetDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (req.targetDate < today) {
        throw APIError.invalidArgument("targetDate cannot be in the past");
      }

      // Validate target date is not too far in the future (50 years)
      const fiftyYearsFromNow = new Date();
      fiftyYearsFromNow.setFullYear(fiftyYearsFromNow.getFullYear() + 50);
      if (req.targetDate > fiftyYearsFromNow) {
        throw APIError.invalidArgument("targetDate cannot be more than 50 years in the future");
      }
    }

    if (req.description && req.description.length > 1000) {
      throw APIError.invalidArgument("description cannot exceed 1000 characters");
    }

    try {
      const result = await financeDB.queryRow<{
        id: number;
        name: string;
        target_amount: number;
        current_amount: number;
        target_date: Date | null;
        description: string | null;
        created_at: Date;
      }>`
        INSERT INTO financial_goals (name, target_amount, current_amount, target_date, description)
        VALUES (${req.name.trim()}, ${req.targetAmount}, ${req.currentAmount || 0}, ${req.targetDate || null}, ${req.description?.trim() || null})
        RETURNING id, name, target_amount, current_amount, target_date, description, created_at
      `;

      if (!result) {
        throw APIError.internal("failed to create goal");
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
      throw APIError.internal("failed to create goal");
    }
  }
);
