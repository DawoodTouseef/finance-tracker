export type TransactionType = "income" | "expense";
export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";
export type BudgetPeriod = "monthly" | "yearly";
export type BillStatus = "pending" | "paid" | "overdue";

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
  color: string;
  createdAt: Date;
}

export interface Transaction {
  id: number;
  amount: number;
  description: string;
  categoryId: number;
  date: Date;
  isRecurring: boolean;
  recurringFrequency?: RecurringFrequency;
  recurringEndDate?: Date;
  createdAt: Date;
  category?: Category;
}

export interface Budget {
  id: number;
  categoryId: number;
  amount: number;
  period: BudgetPeriod;
  startDate: Date;
  endDate?: Date;
  createdAt: Date;
  category?: Category;
}

export interface FinancialGoal {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: Date;
  description?: string;
  createdAt: Date;
}

export interface Bill {
  id: number;
  name: string;
  amount: number;
  categoryId: number;
  dueDate: Date;
  frequency: RecurringFrequency;
  status: BillStatus;
  description?: string;
  autoPayEnabled: boolean;
  reminderDays: number;
  lastPaidDate?: Date;
  nextDueDate: Date;
  createdAt: Date;
  category?: Category;
}

export interface BillPayment {
  id: number;
  billId: number;
  transactionId?: number;
  amount: number;
  paidDate: Date;
  isAutoDetected: boolean;
  notes?: string;
  createdAt: Date;
}
