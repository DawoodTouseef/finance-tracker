import { api } from "encore.dev/api";
import { CronJob } from "encore.dev/cron";
import { financeDB } from "./db";

interface BudgetAlert {
  budgetId: number;
  categoryName: string;
  categoryColor: string;
  budgetAmount: number;
  spentAmount: number;
  percentage: number;
  alertType: "warning" | "danger" | "exceeded";
  period: string;
}

interface NotificationSettings {
  warningThreshold: number; // e.g., 80
  dangerThreshold: number; // e.g., 90
  enableNotifications: boolean;
}

// Check budget alerts daily at 8 AM
const checkBudgetAlerts = new CronJob("budget-alerts", {
  title: "Check Budget Alerts",
  schedule: "0 8 * * *", // Daily at 8 AM
  endpoint: processBudgetAlerts,
});

// Processes budget alerts and returns current alerts for all budgets.
export const processBudgetAlerts = api<void, { alerts: BudgetAlert[] }>(
  { expose: false, method: "POST", path: "/internal/budget-alerts" },
  async () => {
    const alerts: BudgetAlert[] = [];
    
    // Get all active budgets with spending information
    const budgets = await financeDB.queryAll<{
      id: number;
      category_id: number;
      amount: number;
      period: string;
      start_date: Date;
      end_date: Date | null;
      category_name: string;
      category_color: string;
      spent: number | null;
    }>`
      SELECT 
        b.id, b.category_id, b.amount, b.period, b.start_date, b.end_date,
        c.name as category_name, c.color as category_color,
        COALESCE(SUM(t.amount), 0) as spent
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      LEFT JOIN transactions t ON t.category_id = b.category_id 
        AND t.date >= b.start_date 
        AND (b.end_date IS NULL OR t.date <= b.end_date)
        AND c.type = 'expense'
      WHERE b.start_date <= CURRENT_DATE
        AND (b.end_date IS NULL OR b.end_date >= CURRENT_DATE)
      GROUP BY b.id, b.category_id, b.amount, b.period, b.start_date, b.end_date,
               c.name, c.color
    `;

    const settings: NotificationSettings = {
      warningThreshold: 80,
      dangerThreshold: 90,
      enableNotifications: true,
    };

    for (const budget of budgets) {
      const spent = budget.spent || 0;
      const percentage = (spent / budget.amount) * 100;

      let alertType: "warning" | "danger" | "exceeded" | null = null;

      if (percentage >= 100) {
        alertType = "exceeded";
      } else if (percentage >= settings.dangerThreshold) {
        alertType = "danger";
      } else if (percentage >= settings.warningThreshold) {
        alertType = "warning";
      }

      if (alertType && settings.enableNotifications) {
        alerts.push({
          budgetId: budget.id,
          categoryName: budget.category_name,
          categoryColor: budget.category_color,
          budgetAmount: budget.amount,
          spentAmount: spent,
          percentage,
          alertType,
          period: budget.period,
        });
      }
    }

    return { alerts };
  }
);

// Gets current budget alerts for the user interface.
export const getBudgetAlerts = api<void, { alerts: BudgetAlert[] }>(
  { expose: true, method: "GET", path: "/notifications/budget-alerts" },
  async () => {
    return await processBudgetAlerts();
  }
);

interface NotificationPreferences {
  warningThreshold: number;
  dangerThreshold: number;
  enableNotifications: boolean;
  enableEmailNotifications: boolean;
}

// Gets user notification preferences.
export const getNotificationPreferences = api<void, NotificationPreferences>(
  { expose: true, method: "GET", path: "/notifications/preferences" },
  async () => {
    // For now, return default preferences
    // In a real app, this would be stored per user
    return {
      warningThreshold: 80,
      dangerThreshold: 90,
      enableNotifications: true,
      enableEmailNotifications: false,
    };
  }
);

// Updates user notification preferences.
export const updateNotificationPreferences = api<NotificationPreferences, NotificationPreferences>(
  { expose: true, method: "PUT", path: "/notifications/preferences" },
  async (req) => {
    // Validate thresholds
    if (req.warningThreshold < 0 || req.warningThreshold > 100) {
      throw new Error("Warning threshold must be between 0 and 100");
    }
    
    if (req.dangerThreshold < 0 || req.dangerThreshold > 100) {
      throw new Error("Danger threshold must be between 0 and 100");
    }
    
    if (req.warningThreshold >= req.dangerThreshold) {
      throw new Error("Warning threshold must be less than danger threshold");
    }

    // For now, just return the preferences
    // In a real app, this would be stored per user in the database
    return req;
  }
);
