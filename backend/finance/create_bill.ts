import { api, APIError } from "encore.dev/api";
import { financeDB } from "./db";
import type { Bill, RecurringFrequency } from "./types";

export interface CreateBillRequest {
  name: string;
  amount: number;
  categoryId: number;
  dueDate: Date;
  frequency: RecurringFrequency;
  description?: string;
  autoPayEnabled?: boolean;
  reminderDays?: number;
}

// Creates a new recurring bill.
export const createBill = api<CreateBillRequest, Bill>(
  { expose: true, method: "POST", path: "/bills" },
  async (req) => {
    // Input validation
    if (!req.name || req.name.trim().length === 0) {
      throw APIError.invalidArgument("name is required and cannot be empty");
    }

    if (req.name.length > 255) {
      throw APIError.invalidArgument("name cannot exceed 255 characters");
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

    if (!req.dueDate) {
      throw APIError.invalidArgument("dueDate is required");
    }

    if (!req.frequency || !["daily", "weekly", "monthly", "yearly"].includes(req.frequency)) {
      throw APIError.invalidArgument("frequency must be daily, weekly, monthly, or yearly");
    }

    if (req.reminderDays !== undefined && (req.reminderDays < 0 || req.reminderDays > 30)) {
      throw APIError.invalidArgument("reminderDays must be between 0 and 30");
    }

    if (req.description && req.description.length > 1000) {
      throw APIError.invalidArgument("description cannot exceed 1000 characters");
    }

    // Verify category exists and is an expense category
    const category = await financeDB.queryRow<{ id: number; type: string }>`
      SELECT id, type FROM categories WHERE id = ${req.categoryId}
    `;

    if (!category) {
      throw APIError.notFound("category not found");
    }

    if (category.type !== "expense") {
      throw APIError.invalidArgument("bills can only be created for expense categories");
    }

    // Calculate next due date
    const nextDueDate = calculateNextDueDate(req.dueDate, req.frequency);

    try {
      const result = await financeDB.queryRow<{
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
      }>`
        INSERT INTO bills (
          name, amount, category_id, due_date, frequency, description,
          auto_pay_enabled, reminder_days, next_due_date
        )
        VALUES (
          ${req.name.trim()}, ${req.amount}, ${req.categoryId}, ${req.dueDate},
          ${req.frequency}, ${req.description?.trim() || null},
          ${req.autoPayEnabled || false}, ${req.reminderDays || 3}, ${nextDueDate}
        )
        RETURNING id, name, amount, category_id, due_date, frequency, status,
                  description, auto_pay_enabled, reminder_days, last_paid_date,
                  next_due_date, created_at
      `;

      if (!result) {
        throw APIError.internal("failed to create bill");
      }

      return {
        id: result.id,
        name: result.name,
        amount: result.amount,
        categoryId: result.category_id,
        dueDate: result.due_date,
        frequency: result.frequency as RecurringFrequency,
        status: result.status as "pending" | "paid" | "overdue",
        description: result.description || undefined,
        autoPayEnabled: result.auto_pay_enabled,
        reminderDays: result.reminder_days,
        lastPaidDate: result.last_paid_date || undefined,
        nextDueDate: result.next_due_date,
        createdAt: result.created_at,
      };
    } catch (err: any) {
      if (err.code === "23503") { // foreign key violation
        throw APIError.notFound("category not found");
      }
      throw APIError.internal("failed to create bill");
    }
  }
);

function calculateNextDueDate(dueDate: Date, frequency: RecurringFrequency): Date {
  const nextDate = new Date(dueDate);
  const today = new Date();
  
  // If due date is in the future, return it as is
  if (nextDate > today) {
    return nextDate;
  }

  // Calculate next occurrence based on frequency
  switch (frequency) {
    case "daily":
      while (nextDate <= today) {
        nextDate.setDate(nextDate.getDate() + 1);
      }
      break;
    case "weekly":
      while (nextDate <= today) {
        nextDate.setDate(nextDate.getDate() + 7);
      }
      break;
    case "monthly":
      while (nextDate <= today) {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      break;
    case "yearly":
      while (nextDate <= today) {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }
      break;
  }

  return nextDate;
}
