import { api } from "encore.dev/api";
import { financeDB } from "./db";
import type { Budget, Category } from "./types";

interface ListBudgetsResponse {
  budgets: (Budget & { category: Category; spent: number })[];
}

// Retrieves all budgets with spending information.
export const listBudgets = api<void, ListBudgetsResponse>(
  { expose: true, method: "GET", path: "/budgets" },
  async () => {
    const budgets = await financeDB.queryAll<{
      id: number;
      category_id: number;
      amount: number;
      period: string;
      start_date: Date;
      end_date: Date | null;
      created_at: Date;
      category_name: string;
      category_type: string;
      category_color: string;
      category_created_at: Date;
      spent: number | null;
    }>`
      SELECT 
        b.id, b.category_id, b.amount, b.period, b.start_date, b.end_date, b.created_at,
        c.name as category_name, c.type as category_type, c.color as category_color,
        c.created_at as category_created_at,
        COALESCE(SUM(t.amount), 0) as spent
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      LEFT JOIN transactions t ON t.category_id = b.category_id 
        AND t.date >= b.start_date 
        AND (b.end_date IS NULL OR t.date <= b.end_date)
        AND c.type = 'expense'
      GROUP BY b.id, b.category_id, b.amount, b.period, b.start_date, b.end_date, 
               b.created_at, c.name, c.type, c.color, c.created_at
      ORDER BY b.created_at DESC
    `;

    return {
      budgets: budgets.map(b => ({
        id: b.id,
        categoryId: b.category_id,
        amount: b.amount,
        period: b.period as "monthly" | "yearly",
        startDate: b.start_date,
        endDate: b.end_date || undefined,
        createdAt: b.created_at,
        category: {
          id: b.category_id,
          name: b.category_name,
          type: b.category_type as "income" | "expense",
          color: b.category_color,
          createdAt: b.category_created_at,
        },
        spent: b.spent || 0,
      })),
    };
  }
);
