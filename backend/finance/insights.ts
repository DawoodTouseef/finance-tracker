import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { financeDB } from "./db";

interface SpendingTrend {
  month: string;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  amount: number;
  transactionCount: number;
  averageTransaction: number;
}

interface CategoryComparison {
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  currentPeriod: number;
  previousPeriod: number;
  change: number;
  changePercentage: number;
  trend: "up" | "down" | "stable";
}

interface BudgetPerformance {
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  budgetAmount: number;
  spentAmount: number;
  remainingAmount: number;
  utilizationPercentage: number;
  performance: "excellent" | "good" | "warning" | "over";
  daysRemaining?: number;
  projectedSpending?: number;
}

interface PersonalizedRecommendation {
  type: "budget" | "savings" | "category" | "goal";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  actionable: boolean;
  categoryId?: number;
  amount?: number;
}

interface InsightsParams {
  months?: Query<number>; // Number of months to analyze (default: 6)
}

interface InsightsResponse {
  spendingTrends: SpendingTrend[];
  categoryComparisons: CategoryComparison[];
  budgetPerformance: BudgetPerformance[];
  recommendations: PersonalizedRecommendation[];
  summary: {
    totalMonthsAnalyzed: number;
    averageMonthlyIncome: number;
    averageMonthlyExpenses: number;
    savingsRate: number;
    topSpendingCategory: string;
    mostImprovedCategory: string;
  };
}

// Generates comprehensive financial insights including spending trends, category comparisons, and personalized recommendations.
export const getInsights = api<InsightsParams, InsightsResponse>(
  { expose: true, method: "GET", path: "/insights" },
  async (params) => {
    const monthsToAnalyze = params.months || 6;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsToAnalyze);

    // Get spending trends by month and category
    const spendingTrends = await getSpendingTrends(startDate, endDate);
    
    // Get category comparisons (current vs previous period)
    const categoryComparisons = await getCategoryComparisons(monthsToAnalyze);
    
    // Get budget performance
    const budgetPerformance = await getBudgetPerformance();
    
    // Generate personalized recommendations
    const recommendations = await generateRecommendations(spendingTrends, categoryComparisons, budgetPerformance);
    
    // Calculate summary statistics
    const summary = await calculateSummary(startDate, endDate, spendingTrends, categoryComparisons);

    return {
      spendingTrends,
      categoryComparisons,
      budgetPerformance,
      recommendations,
      summary,
    };
  }
);

async function getSpendingTrends(startDate: Date, endDate: Date): Promise<SpendingTrend[]> {
  const trends = await financeDB.queryAll<{
    month: string;
    category_id: number;
    category_name: string;
    category_color: string;
    amount: number;
    transaction_count: number;
  }>`
    SELECT 
      TO_CHAR(t.date, 'YYYY-MM') as month,
      c.id as category_id,
      c.name as category_name,
      c.color as category_color,
      SUM(t.amount) as amount,
      COUNT(t.id) as transaction_count
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.date >= ${startDate} AND t.date <= ${endDate}
      AND c.type = 'expense'
    GROUP BY TO_CHAR(t.date, 'YYYY-MM'), c.id, c.name, c.color
    ORDER BY month DESC, amount DESC
  `;

  return trends.map(trend => ({
    month: trend.month,
    categoryId: trend.category_id,
    categoryName: trend.category_name,
    categoryColor: trend.category_color,
    amount: trend.amount,
    transactionCount: trend.transaction_count,
    averageTransaction: trend.amount / trend.transaction_count,
  }));
}

async function getCategoryComparisons(monthsToAnalyze: number): Promise<CategoryComparison[]> {
  const currentPeriodStart = new Date();
  currentPeriodStart.setMonth(currentPeriodStart.getMonth() - Math.floor(monthsToAnalyze / 2));
  
  const previousPeriodStart = new Date();
  previousPeriodStart.setMonth(previousPeriodStart.getMonth() - monthsToAnalyze);
  
  const previousPeriodEnd = new Date(currentPeriodStart);

  // Get current period data
  const currentPeriodData = await financeDB.queryAll<{
    category_id: number;
    category_name: string;
    category_color: string;
    amount: number;
  }>`
    SELECT 
      c.id as category_id,
      c.name as category_name,
      c.color as category_color,
      COALESCE(SUM(t.amount), 0) as amount
    FROM categories c
    LEFT JOIN transactions t ON c.id = t.category_id 
      AND t.date >= ${currentPeriodStart}
      AND c.type = 'expense'
    GROUP BY c.id, c.name, c.color
    HAVING COALESCE(SUM(t.amount), 0) > 0
  `;

  // Get previous period data
  const previousPeriodData = await financeDB.queryAll<{
    category_id: number;
    amount: number;
  }>`
    SELECT 
      c.id as category_id,
      COALESCE(SUM(t.amount), 0) as amount
    FROM categories c
    LEFT JOIN transactions t ON c.id = t.category_id 
      AND t.date >= ${previousPeriodStart}
      AND t.date < ${previousPeriodEnd}
      AND c.type = 'expense'
    GROUP BY c.id
  `;

  const previousPeriodMap = new Map<number, number>();
  previousPeriodData.forEach(item => {
    previousPeriodMap.set(item.category_id, item.amount);
  });

  return currentPeriodData.map(current => {
    const previousAmount = previousPeriodMap.get(current.category_id) || 0;
    const change = current.amount - previousAmount;
    const changePercentage = previousAmount > 0 ? (change / previousAmount) * 100 : 0;
    
    let trend: "up" | "down" | "stable" = "stable";
    if (Math.abs(changePercentage) > 5) {
      trend = changePercentage > 0 ? "up" : "down";
    }

    return {
      categoryId: current.category_id,
      categoryName: current.category_name,
      categoryColor: current.category_color,
      currentPeriod: current.amount,
      previousPeriod: previousAmount,
      change,
      changePercentage,
      trend,
    };
  });
}

async function getBudgetPerformance(): Promise<BudgetPerformance[]> {
  const today = new Date();
  
  const budgets = await financeDB.queryAll<{
    id: number;
    category_id: number;
    category_name: string;
    category_color: string;
    amount: number;
    period: string;
    start_date: Date;
    end_date: Date | null;
    spent: number;
  }>`
    SELECT 
      b.id, b.category_id, c.name as category_name, c.color as category_color,
      b.amount, b.period, b.start_date, b.end_date,
      COALESCE(SUM(t.amount), 0) as spent
    FROM budgets b
    JOIN categories c ON b.category_id = c.id
    LEFT JOIN transactions t ON t.category_id = b.category_id 
      AND t.date >= b.start_date 
      AND (b.end_date IS NULL OR t.date <= b.end_date)
      AND c.type = 'expense'
    WHERE b.start_date <= ${today}
      AND (b.end_date IS NULL OR b.end_date >= ${today})
    GROUP BY b.id, b.category_id, c.name, c.color, b.amount, b.period, b.start_date, b.end_date
  `;

  return budgets.map(budget => {
    const utilizationPercentage = (budget.spent / budget.amount) * 100;
    const remainingAmount = budget.amount - budget.spent;
    
    let performance: "excellent" | "good" | "warning" | "over";
    if (utilizationPercentage <= 60) {
      performance = "excellent";
    } else if (utilizationPercentage <= 80) {
      performance = "good";
    } else if (utilizationPercentage <= 100) {
      performance = "warning";
    } else {
      performance = "over";
    }

    // Calculate days remaining and projected spending
    let daysRemaining: number | undefined;
    let projectedSpending: number | undefined;
    
    if (budget.end_date) {
      const endDate = new Date(budget.end_date);
      const startDate = new Date(budget.start_date);
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const elapsedDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      daysRemaining = Math.max(0, totalDays - elapsedDays);
      
      if (elapsedDays > 0) {
        const dailySpendingRate = budget.spent / elapsedDays;
        projectedSpending = dailySpendingRate * totalDays;
      }
    }

    return {
      categoryId: budget.category_id,
      categoryName: budget.category_name,
      categoryColor: budget.category_color,
      budgetAmount: budget.amount,
      spentAmount: budget.spent,
      remainingAmount,
      utilizationPercentage,
      performance,
      daysRemaining,
      projectedSpending,
    };
  });
}

async function generateRecommendations(
  spendingTrends: SpendingTrend[],
  categoryComparisons: CategoryComparison[],
  budgetPerformance: BudgetPerformance[]
): Promise<PersonalizedRecommendation[]> {
  const recommendations: PersonalizedRecommendation[] = [];

  // Budget-related recommendations
  budgetPerformance.forEach(budget => {
    if (budget.performance === "over") {
      recommendations.push({
        type: "budget",
        title: `${budget.categoryName} Budget Exceeded`,
        description: `You've spent $${budget.spentAmount.toFixed(2)} against a budget of $${budget.budgetAmount.toFixed(2)}. Consider reviewing your spending in this category.`,
        priority: "high",
        actionable: true,
        categoryId: budget.categoryId,
        amount: budget.spentAmount - budget.budgetAmount,
      });
    } else if (budget.performance === "warning" && budget.projectedSpending && budget.projectedSpending > budget.budgetAmount) {
      recommendations.push({
        type: "budget",
        title: `${budget.categoryName} Budget at Risk`,
        description: `Based on current spending patterns, you're projected to exceed your budget by $${(budget.projectedSpending - budget.budgetAmount).toFixed(2)}.`,
        priority: "medium",
        actionable: true,
        categoryId: budget.categoryId,
        amount: budget.projectedSpending - budget.budgetAmount,
      });
    }
  });

  // Category trend recommendations
  const highIncreaseCategories = categoryComparisons
    .filter(cat => cat.trend === "up" && cat.changePercentage > 25)
    .sort((a, b) => b.changePercentage - a.changePercentage)
    .slice(0, 3);

  highIncreaseCategories.forEach(category => {
    recommendations.push({
      type: "category",
      title: `${category.categoryName} Spending Increased`,
      description: `Your ${category.categoryName} spending increased by ${category.changePercentage.toFixed(1)}% compared to the previous period. Consider setting a budget for this category.`,
      priority: "medium",
      actionable: true,
      categoryId: category.categoryId,
      amount: category.change,
    });
  });

  // Savings recommendations
  const totalIncome = await financeDB.queryRow<{ total: number }>`
    SELECT COALESCE(SUM(t.amount), 0) as total
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE c.type = 'income'
      AND t.date >= CURRENT_DATE - INTERVAL '30 days'
  `;

  const totalExpenses = await financeDB.queryRow<{ total: number }>`
    SELECT COALESCE(SUM(t.amount), 0) as total
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE c.type = 'expense'
      AND t.date >= CURRENT_DATE - INTERVAL '30 days'
  `;

  if (totalIncome && totalExpenses) {
    const savingsRate = ((totalIncome.total - totalExpenses.total) / totalIncome.total) * 100;
    
    if (savingsRate < 10) {
      recommendations.push({
        type: "savings",
        title: "Low Savings Rate",
        description: `Your current savings rate is ${savingsRate.toFixed(1)}%. Consider aiming for at least 20% of your income.`,
        priority: "high",
        actionable: true,
        amount: totalIncome.total * 0.2 - (totalIncome.total - totalExpenses.total),
      });
    } else if (savingsRate < 20) {
      recommendations.push({
        type: "savings",
        title: "Improve Savings Rate",
        description: `Your savings rate of ${savingsRate.toFixed(1)}% is good, but you could aim for 20% or higher.`,
        priority: "medium",
        actionable: true,
        amount: totalIncome.total * 0.2 - (totalIncome.total - totalExpenses.total),
      });
    }
  }

  // Goal recommendations
  const goals = await financeDB.queryAll<{
    id: number;
    name: string;
    target_amount: number;
    current_amount: number;
    target_date: Date | null;
  }>`
    SELECT id, name, target_amount, current_amount, target_date
    FROM financial_goals
    WHERE current_amount < target_amount
  `;

  goals.forEach(goal => {
    const remaining = goal.target_amount - goal.current_amount;
    const progress = (goal.current_amount / goal.target_amount) * 100;
    
    if (progress < 25 && goal.target_date) {
      const daysUntilTarget = Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilTarget > 0) {
        const dailySavingsNeeded = remaining / daysUntilTarget;
        recommendations.push({
          type: "goal",
          title: `${goal.name} Goal Behind Schedule`,
          description: `To reach your goal by the target date, you need to save $${dailySavingsNeeded.toFixed(2)} per day.`,
          priority: "medium",
          actionable: true,
          amount: dailySavingsNeeded,
        });
      }
    }
  });

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

async function calculateSummary(
  startDate: Date,
  endDate: Date,
  spendingTrends: SpendingTrend[],
  categoryComparisons: CategoryComparison[]
): Promise<InsightsResponse['summary']> {
  const monthsAnalyzed = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

  // Calculate average monthly income and expenses
  const monthlyData = await financeDB.queryAll<{
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
    WHERE t.date >= ${startDate} AND t.date <= ${endDate}
    GROUP BY TO_CHAR(t.date, 'YYYY-MM')
  `;

  const averageMonthlyIncome = monthlyData.reduce((sum, month) => sum + month.income, 0) / Math.max(monthlyData.length, 1);
  const averageMonthlyExpenses = monthlyData.reduce((sum, month) => sum + month.expenses, 0) / Math.max(monthlyData.length, 1);
  const savingsRate = averageMonthlyIncome > 0 ? ((averageMonthlyIncome - averageMonthlyExpenses) / averageMonthlyIncome) * 100 : 0;

  // Find top spending category
  const categoryTotals = new Map<string, number>();
  spendingTrends.forEach(trend => {
    const current = categoryTotals.get(trend.categoryName) || 0;
    categoryTotals.set(trend.categoryName, current + trend.amount);
  });

  const topSpendingCategory = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || "None";

  // Find most improved category (biggest decrease)
  const mostImprovedCategory = categoryComparisons
    .filter(cat => cat.trend === "down")
    .sort((a, b) => a.changePercentage - b.changePercentage)[0]?.categoryName || "None";

  return {
    totalMonthsAnalyzed: monthsAnalyzed,
    averageMonthlyIncome,
    averageMonthlyExpenses,
    savingsRate,
    topSpendingCategory,
    mostImprovedCategory,
  };
}
