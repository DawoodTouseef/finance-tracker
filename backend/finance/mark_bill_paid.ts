import { api, APIError } from "encore.dev/api";
import { financeDB } from "./db";
import type { BillPayment, RecurringFrequency } from "./types";

interface MarkBillPaidParams {
  id: number;
}

export interface MarkBillPaidRequest {
  amount?: number;
  paidDate?: Date;
  transactionId?: number;
  notes?: string;
}

interface MarkBillPaidResponse {
  payment: BillPayment;
  nextDueDate: Date;
}

// Marks a bill as paid and creates a payment record.
export const markBillPaid = api<MarkBillPaidParams & MarkBillPaidRequest, MarkBillPaidResponse>(
  { expose: true, method: "POST", path: "/bills/:id/pay" },
  async (req) => {
    if (!req.id || req.id <= 0) {
      throw APIError.invalidArgument("valid bill id is required");
    }

    // Get bill details
    const bill = await financeDB.queryRow<{
      id: number;
      name: string;
      amount: number;
      frequency: string;
      due_date: Date;
      next_due_date: Date;
    }>`
      SELECT id, name, amount, frequency, due_date, next_due_date
      FROM bills 
      WHERE id = ${req.id}
    `;

    if (!bill) {
      throw APIError.notFound("bill not found");
    }

    const paymentAmount = req.amount || bill.amount;
    const paidDate = req.paidDate || new Date();

    if (paymentAmount <= 0) {
      throw APIError.invalidArgument("payment amount must be greater than 0");
    }

    if (paymentAmount > 999999999.99) {
      throw APIError.invalidArgument("payment amount cannot exceed 999,999,999.99");
    }

    // Verify transaction exists if provided
    if (req.transactionId) {
      const transaction = await financeDB.queryRow<{ id: number }>`
        SELECT id FROM transactions WHERE id = ${req.transactionId}
      `;

      if (!transaction) {
        throw APIError.notFound("transaction not found");
      }
    }

    // Calculate next due date
    const nextDueDate = calculateNextDueDate(bill.next_due_date, bill.frequency as RecurringFrequency);

    try {
      // Start transaction
      await financeDB.exec`BEGIN`;

      // Create payment record
      const payment = await financeDB.queryRow<{
        id: number;
        bill_id: number;
        transaction_id: number | null;
        amount: number;
        paid_date: Date;
        is_auto_detected: boolean;
        notes: string | null;
        created_at: Date;
      }>`
        INSERT INTO bill_payments (bill_id, transaction_id, amount, paid_date, is_auto_detected, notes)
        VALUES (${req.id}, ${req.transactionId || null}, ${paymentAmount}, ${paidDate}, false, ${req.notes || null})
        RETURNING id, bill_id, transaction_id, amount, paid_date, is_auto_detected, notes, created_at
      `;

      if (!payment) {
        throw APIError.internal("failed to create payment record");
      }

      // Update bill status and next due date
      await financeDB.exec`
        UPDATE bills 
        SET status = 'paid', last_paid_date = ${paidDate}, next_due_date = ${nextDueDate}
        WHERE id = ${req.id}
      `;

      await financeDB.exec`COMMIT`;

      return {
        payment: {
          id: payment.id,
          billId: payment.bill_id,
          transactionId: payment.transaction_id || undefined,
          amount: payment.amount,
          paidDate: payment.paid_date,
          isAutoDetected: payment.is_auto_detected,
          notes: payment.notes || undefined,
          createdAt: payment.created_at,
        },
        nextDueDate,
      };
    } catch (err: any) {
      await financeDB.exec`ROLLBACK`;
      if (err.code === "23503") { // foreign key violation
        throw APIError.notFound("transaction not found");
      }
      throw APIError.internal("failed to mark bill as paid");
    }
  }
);

function calculateNextDueDate(currentDueDate: Date, frequency: RecurringFrequency): Date {
  const nextDate = new Date(currentDueDate);

  switch (frequency) {
    case "daily":
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case "weekly":
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case "monthly":
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case "yearly":
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }

  return nextDate;
}
