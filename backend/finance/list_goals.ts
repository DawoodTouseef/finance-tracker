import { api } from "encore.dev/api";
import { financeDB } from "./db";
import type { FinancialGoal } from "./types";

interface ListGoalsResponse {
  goals: FinancialGoal[];
}

// Retrieves all financial goals.
export const listGoals = api<void, ListGoalsResponse>(
  { expose: true, method: "GET", path: "/goals" },
  async () => {
    const goals = await financeDB.queryAll<{
      id: number;
      name: string;
      target_amount: number;
      current_amount: number;
      target_date: Date | null;
      description: string | null;
      created_at: Date;
    }>`
      SELECT id, name, target_amount, current_amount, target_date, description, created_at
      FROM financial_goals
      ORDER BY created_at DESC
    `;

    return {
      goals: goals.map(g => ({
        id: g.id,
        name: g.name,
        targetAmount: g.target_amount,
        currentAmount: g.current_amount,
        targetDate: g.target_date || undefined,
        description: g.description || undefined,
        createdAt: g.created_at,
      })),
    };
  }
);
