import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { financeDB } from "./db";

interface GetReportsParams {
  startDate?: Query<string>;
  endDate?: Query<string>;
}

interface CategorySummary {
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  total: number;
  transactionCount: number;
}

interface MonthlySummary {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

interface GetReportsResponse {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  incomeByCategory: CategorySummary[];
  expensesByCategory: CategorySummary[];
  monthlyTrends: MonthlySummary[];
}

// Generates financial reports and analytics for the specified date range.
export const getReports = api<GetReportsParams, GetReportsResponse>(
  { expose: true, method: "GET", path: "/reports" },
  async (params) => {
    const startDate = params.startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const endDate = params.endDate || new Date().toISOString().split('T')[0];

    // Optimized query to get all summary data in a single query
    const summaryData = await financeDB.queryAll<{
      type: string;
      category_id: number;
      category_name: string;
      category_color: string;
      total: number;
      transaction_count: number;
    }>`
      SELECT 
        c.type,
        c.id as category_id,
        c.name as category_name,
        c.color as category_color,
        COALESCE(SUM(t.amount), 0) as total,
        COUNT(t.id) as transaction_count
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id 
        AND t.date >= ${startDate}::date 
        AND t.date <= ${endDate}::date
      GROUP BY c.type, c.id, c.name, c.color
      HAVING COALESCE(SUM(t.amount), 0) > 0
      ORDER BY c.type, total DESC
    `;

    // Optimized monthly trends query with better aggregation
    const monthlyTrends = await financeDB.queryAll<{
      month: string;
      income: number;
      expenses: number;
    }>`
      SELECT 
        TO_CHAR(t.date, 'YYYY-MM') as month,
        COALESCE(SUM(CASE WHEN c.type = 'income' THEN t.amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN c.type = 'expense' THEN t.amount ELSE 0 END), 0) as expenses
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      WHERE t.date >= ${startDate}::date 
        AND t.date <= ${endDate}::date
      GROUP BY TO_CHAR(t.date, 'YYYY-MM')
      ORDER BY month
    `;

    // Process summary data
    const incomeByCategory: CategorySummary[] = [];
    const expensesByCategory: CategorySummary[] = [];
    let totalIncome = 0;
    let totalExpenses = 0;

    summaryData.forEach(item => {
      const categoryData = {
        categoryId: item.category_id,
        categoryName: item.category_name,
        categoryColor: item.category_color,
        total: item.total,
        transactionCount: item.transaction_count,
      };

      if (item.type === 'income') {
        incomeByCategory.push(categoryData);
        totalIncome += item.total;
      } else {
        expensesByCategory.push(categoryData);
        totalExpenses += item.total;
      }
    });

    // Process monthly trends
    const processedMonthlyTrends: MonthlySummary[] = monthlyTrends.map(trend => ({
      month: trend.month,
      income: trend.income,
      expenses: trend.expenses,
      net: trend.income - trend.expenses,
    }));

    return {
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      incomeByCategory,
      expensesByCategory,
      monthlyTrends: processedMonthlyTrends,
    };
  }
);
