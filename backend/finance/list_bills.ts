import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { financeDB } from "./db";
import type { Bill, Category } from "./types";

interface ListBillsParams {
  status?: Query<string>;
  categoryIds?: Query<string>;
  dueSoon?: Query<boolean>; // bills due within reminder days
}

interface ListBillsResponse {
  bills: (Bill & { category: Category })[];
}

// Retrieves all bills with optional filtering.
export const listBills = api<ListBillsParams, ListBillsResponse>(
  { expose: true, method: "GET", path: "/bills" },
  async (params) => {
    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Status filter
    if (params.status && ["pending", "paid", "overdue"].includes(params.status)) {
      whereClause += ` AND b.status = $${paramIndex}`;
      queryParams.push(params.status);
      paramIndex++;
    }

    // Category filter
    if (params.categoryIds) {
      const categoryIds = params.categoryIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (categoryIds.length > 0) {
        const placeholders = categoryIds.map(() => `$${paramIndex++}`).join(',');
        whereClause += ` AND b.category_id IN (${placeholders})`;
        queryParams.push(...categoryIds);
      }
    }

    // Due soon filter
    if (params.dueSoon) {
      whereClause += ` AND b.next_due_date <= CURRENT_DATE + INTERVAL '1 day' * b.reminder_days`;
    }

    const query = `
      SELECT 
        b.id, b.name, b.amount, b.category_id, b.due_date, b.frequency, b.status,
        b.description, b.auto_pay_enabled, b.reminder_days, b.last_paid_date,
        b.next_due_date, b.created_at,
        c.name as category_name, c.type as category_type, c.color as category_color,
        c.created_at as category_created_at
      FROM bills b
      JOIN categories c ON b.category_id = c.id
      ${whereClause}
      ORDER BY b.next_due_date ASC, b.created_at DESC
    `;

    const bills = await financeDB.rawQueryAll<{
      id: number;
      name: string;
      amount: number;
      category_id: number;
      due_date: Date;
      frequency: string;
      status: string;
      description: string | null;
      auto_pay_enabled: boolean;
      reminder_days: number;
      last_paid_date: Date | null;
      next_due_date: Date;
      created_at: Date;
      category_name: string;
      category_type: string;
      category_color: string;
      category_created_at: Date;
    }>(query, ...queryParams);

    return {
      bills: bills.map(b => ({
        id: b.id,
        name: b.name,
        amount: b.amount,
        categoryId: b.category_id,
        dueDate: b.due_date,
        frequency: b.frequency as "daily" | "weekly" | "monthly" | "yearly",
        status: b.status as "pending" | "paid" | "overdue",
        description: b.description || undefined,
        autoPayEnabled: b.auto_pay_enabled,
        reminderDays: b.reminder_days,
        lastPaidDate: b.last_paid_date || undefined,
        nextDueDate: b.next_due_date,
        createdAt: b.created_at,
        category: {
          id: b.category_id,
          name: b.category_name,
          type: b.category_type as "income" | "expense",
          color: b.category_color,
          createdAt: b.category_created_at,
        },
      })),
    };
  }
);
