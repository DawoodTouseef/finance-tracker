import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { financeDB } from "./db";
import type { Transaction, Category } from "./types";

interface ListTransactionsParams {
  limit?: Query<number>;
  offset?: Query<number>;
  categoryIds?: Query<string>; // comma-separated category IDs
  startDate?: Query<string>;
  endDate?: Query<string>;
  search?: Query<string>; // search in description
  minAmount?: Query<number>;
  maxAmount?: Query<number>;
  type?: Query<string>; // income or expense
}

interface ListTransactionsResponse {
  transactions: (Transaction & { category: Category })[];
  total: number;
}

// Retrieves transactions with advanced filtering by categories, date range, amount range, and description search.
export const listTransactions = api<ListTransactionsParams, ListTransactionsResponse>(
  { expose: true, method: "GET", path: "/transactions", auth: true },
  async (params) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    const limit = params.limit || 50;
    const offset = params.offset || 0;
    
    let whereClause = "WHERE t.user_id = $1";
    const queryParams: any[] = [userId];
    let paramIndex = 2;

    // Category filter - support multiple categories
    if (params.categoryIds) {
      const categoryIds = params.categoryIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (categoryIds.length > 0) {
        const placeholders = categoryIds.map(() => `$${paramIndex++}`).join(',');
        whereClause += ` AND t.category_id IN (${placeholders})`;
        queryParams.push(...categoryIds);
      }
    }

    // Date range filters
    if (params.startDate) {
      whereClause += ` AND t.date >= $${paramIndex}`;
      queryParams.push(params.startDate);
      paramIndex++;
    }

    if (params.endDate) {
      whereClause += ` AND t.date <= $${paramIndex}`;
      queryParams.push(params.endDate);
      paramIndex++;
    }

    // Description search
    if (params.search) {
      whereClause += ` AND t.description ILIKE $${paramIndex}`;
      queryParams.push(`%${params.search}%`);
      paramIndex++;
    }

    // Amount range filters
    if (params.minAmount !== undefined) {
      whereClause += ` AND t.amount >= $${paramIndex}`;
      queryParams.push(params.minAmount);
      paramIndex++;
    }

    if (params.maxAmount !== undefined) {
      whereClause += ` AND t.amount <= $${paramIndex}`;
      queryParams.push(params.maxAmount);
      paramIndex++;
    }

    // Transaction type filter
    if (params.type && (params.type === 'income' || params.type === 'expense')) {
      whereClause += ` AND c.type = $${paramIndex}`;
      queryParams.push(params.type);
      paramIndex++;
    }

    const query = `
      SELECT 
        t.id, t.amount, t.description, t.category_id, t.date, 
        t.is_recurring, t.recurring_frequency, t.recurring_end_date, t.created_at,
        c.name as category_name, c.type as category_type, c.color as category_color,
        c.created_at as category_created_at
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      ${whereClause}
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      ${whereClause}
    `;

    queryParams.push(limit, offset);

    const [transactions, countResult] = await Promise.all([
      financeDB.rawQueryAll<{
        id: number;
        amount: number;
        description: string;
        category_id: number;
        date: Date;
        is_recurring: boolean;
        recurring_frequency: string | null;
        recurring_end_date: Date | null;
        created_at: Date;
        category_name: string;
        category_type: string;
        category_color: string;
        category_created_at: Date;
      }>(query, ...queryParams.slice(0, -2), limit, offset),
      financeDB.rawQueryRow<{ total: number }>(countQuery, ...queryParams.slice(0, -2))
    ]);

    return {
      transactions: transactions.map(t => ({
        id: t.id,
        amount: t.amount,
        description: t.description,
        categoryId: t.category_id,
        date: t.date,
        isRecurring: t.is_recurring,
        recurringFrequency: t.recurring_frequency as any,
        recurringEndDate: t.recurring_end_date || undefined,
        createdAt: t.created_at,
        category: {
          id: t.category_id,
          name: t.category_name,
          type: t.category_type as "income" | "expense",
          color: t.category_color,
          createdAt: t.category_created_at,
        },
      })),
      total: countResult?.total || 0,
    };
  }
);
