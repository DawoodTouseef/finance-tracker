import { api } from "encore.dev/api";
import { CronJob } from "encore.dev/cron";
import { financeDB } from "./db";

interface BillReminder {
  billId: number;
  billName: string;
  amount: number;
  categoryName: string;
  categoryColor: string;
  dueDate: Date;
  daysUntilDue: number;
  isOverdue: boolean;
}

// Check for bill reminders daily at 9 AM
const checkBillReminders = new CronJob("bill-reminders", {
  title: "Check Bill Reminders",
  schedule: "0 9 * * *", // Daily at 9 AM
  endpoint: processBillReminders,
});

// Processes bill reminders and updates overdue bills.
export const processBillReminders = api<void, { reminders: BillReminder[] }>(
  { expose: false, method: "POST", path: "/internal/bill-reminders" },
  async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Update overdue bills
    await financeDB.exec`
      UPDATE bills 
      SET status = 'overdue' 
      WHERE status = 'pending' 
        AND next_due_date < ${today}
    `;

    // Get bills that need reminders (due within reminder days or overdue)
    const bills = await financeDB.queryAll<{
      id: number;
      name: string;
      amount: number;
      next_due_date: Date;
      reminder_days: number;
      category_name: string;
      category_color: string;
    }>`
      SELECT 
        b.id, b.name, b.amount, b.next_due_date, b.reminder_days,
        c.name as category_name, c.color as category_color
      FROM bills b
      JOIN categories c ON b.category_id = c.id
      WHERE b.status IN ('pending', 'overdue')
        AND (
          b.next_due_date <= ${today} + INTERVAL '1 day' * b.reminder_days
          OR b.next_due_date < ${today}
        )
      ORDER BY b.next_due_date ASC
    `;

    const reminders: BillReminder[] = bills.map(bill => {
      const dueDate = new Date(bill.next_due_date);
      const timeDiff = dueDate.getTime() - today.getTime();
      const daysUntilDue = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      
      return {
        billId: bill.id,
        billName: bill.name,
        amount: bill.amount,
        categoryName: bill.category_name,
        categoryColor: bill.category_color,
        dueDate: bill.next_due_date,
        daysUntilDue,
        isOverdue: daysUntilDue < 0,
      };
    });

    return { reminders };
  }
);

// Gets current bill reminders for the user interface.
export const getBillReminders = api<void, { reminders: BillReminder[] }>(
  { expose: true, method: "GET", path: "/bills/reminders" },
  async () => {
    return await processBillReminders();
  }
);

// Auto-detect bill payments based on transactions
const autoDetectBillPayments = new CronJob("auto-detect-payments", {
  title: "Auto-detect Bill Payments",
  schedule: "0 10 * * *", // Daily at 10 AM
  endpoint: processAutoDetection,
});

// Automatically detects and matches transactions to bills.
export const processAutoDetection = api<void, { matched: number }>(
  { expose: false, method: "POST", path: "/internal/auto-detect-payments" },
  async () => {
    let matched = 0;
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    // Get pending bills that have auto-pay enabled
    const bills = await financeDB.queryAll<{
      id: number;
      name: string;
      amount: number;
      category_id: number;
      next_due_date: Date;
    }>`
      SELECT id, name, amount, category_id, next_due_date
      FROM bills 
      WHERE status = 'pending' 
        AND auto_pay_enabled = true
        AND next_due_date >= ${sevenDaysAgo}
        AND next_due_date <= ${today}
    `;

    for (const bill of bills) {
      // Look for matching transactions
      const matchingTransaction = await financeDB.queryRow<{
        id: number;
        amount: number;
        date: Date;
      }>`
        SELECT id, amount, date
        FROM transactions t
        WHERE t.category_id = ${bill.category_id}
          AND t.amount = ${bill.amount}
          AND t.date >= ${sevenDaysAgo}
          AND t.date <= ${today}
          AND NOT EXISTS (
            SELECT 1 FROM bill_payments bp 
            WHERE bp.transaction_id = t.id
          )
        ORDER BY ABS(EXTRACT(EPOCH FROM (t.date - ${bill.next_due_date}))) ASC
        LIMIT 1
      `;

      if (matchingTransaction) {
        try {
          // Start transaction
          await financeDB.exec`BEGIN`;

          // Create payment record
          await financeDB.exec`
            INSERT INTO bill_payments (bill_id, transaction_id, amount, paid_date, is_auto_detected)
            VALUES (${bill.id}, ${matchingTransaction.id}, ${matchingTransaction.amount}, ${matchingTransaction.date}, true)
          `;

          // Calculate next due date
          const nextDueDate = calculateNextDueDate(bill.next_due_date, "monthly"); // Default to monthly for auto-detection

          // Update bill status
          await financeDB.exec`
            UPDATE bills 
            SET status = 'paid', last_paid_date = ${matchingTransaction.date}, next_due_date = ${nextDueDate}
            WHERE id = ${bill.id}
          `;

          await financeDB.exec`COMMIT`;
          matched++;
        } catch (err) {
          await financeDB.exec`ROLLBACK`;
          console.error(`Failed to auto-detect payment for bill ${bill.id}:`, err);
        }
      }
    }

    return { matched };
  }
);

function calculateNextDueDate(currentDueDate: Date, frequency: string): Date {
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

// Manual trigger for auto-detection (for testing/admin use)
export const triggerAutoDetection = api<void, { matched: number }>(
  { expose: true, method: "POST", path: "/bills/auto-detect" },
  async () => {
    return await processAutoDetection();
  }
);
