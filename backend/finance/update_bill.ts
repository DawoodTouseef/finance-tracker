import { api, APIError } from "encore.dev/api";
import { financeDB } from "./db";
import type { Bill, RecurringFrequency } from "./types";

interface UpdateBillParams {
  id: number;
}

export interface UpdateBillRequest {
  name?: string;
  amount?: number;
  categoryId?: number;
  dueDate?: Date;
  frequency?: RecurringFrequency;
  description?: string;
  autoPayEnabled?: boolean;
  reminderDays?: number;
}

// Updates an existing bill.
export const updateBill = api<UpdateBillParams & UpdateBillRequest, Bill>(
  { expose: true, method: "PUT", path: "/bills/:id" },
  async (req) => {
    if (!req.id || req.id <= 0) {
      throw APIError.invalidArgument("valid bill id is required");
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

    if (req.frequency !== undefined && !["daily", "weekly", "monthly", "yearly"].includes(req.frequency)) {
      throw APIError.invalidArgument("frequency must be daily, weekly, monthly, or yearly");
    }

    if (req.reminderDays !== undefined && (req.reminderDays < 0 || req.reminderDays > 30)) {
      throw APIError.invalidArgument("reminderDays must be between 0 and 30");
    }

    if (req.description !== undefined && req.description.length > 1000) {
      throw APIError.invalidArgument("description cannot exceed 1000 characters");
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
        throw APIError.invalidArgument("bills can only be created for expense categories");
      }
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (req.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(req.name.trim());
      paramIndex++;
    }

    if (req.amount !== undefined) {
      updates.push(`amount = $${paramIndex}`);
      values.push(req.amount);
      paramIndex++;
    }

    if (req.categoryId !== undefined) {
      updates.push(`category_id = $${paramIndex}`);
      values.push(req.categoryId);
      paramIndex++;
    }

    if (req.dueDate !== undefined) {
      updates.push(`due_date = $${paramIndex}`);
      values.push(req.dueDate);
      paramIndex++;
    }

    if (req.frequency !== undefined) {
      updates.push(`frequency = $${paramIndex}`);
      values.push(req.frequency);
      paramIndex++;
    }

    if (req.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(req.description?.trim() || null);
      paramIndex++;
    }

    if (req.autoPayEnabled !== undefined) {
      updates.push(`auto_pay_enabled = $${paramIndex}`);
      values.push(req.autoPayEnabled);
      paramIndex++;
    }

    if (req.reminderDays !== undefined) {
      updates.push(`reminder_days = $${paramIndex}`);
      values.push(req.reminderDays);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw APIError.invalidArgument("no fields to update");
    }

    // Recalculate next due date if frequency or due date changed
    if (req.dueDate !== undefined || req.frequency !== undefined) {
      // Get current bill data
      const currentBill = await financeDB.queryRow<{
        due_date: Date;
        frequency: string;
      }>`
        SELECT due_date, frequency FROM bills WHERE id = ${req.id}
      `;

      if (!currentBill) {
        throw APIError.notFound("bill not found");
      }

      const newDueDate = req.dueDate || currentBill.due_date;
      const newFrequency = req.frequency || currentBill.frequency;
      const nextDueDate = calculateNextDueDate(newDueDate, newFrequency as RecurringFrequency);

      updates.push(`next_due_date = $${paramIndex}`);
      values.push(nextDueDate);
      paramIndex++;
    }

    const query = `
      UPDATE bills 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, amount, category_id, due_date, frequency, status,
                description, auto_pay_enabled, reminder_days, last_paid_date,
                next_due_date, created_at
    `;

    values.push(req.id);

    try {
      const result = await financeDB.rawQueryRow<{
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
      }>(query, ...values);

      if (!result) {
        throw APIError.notFound("bill not found");
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
      throw APIError.internal("failed to update bill");
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
