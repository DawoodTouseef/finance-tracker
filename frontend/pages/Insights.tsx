import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import backend from "~backend/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertTriangle, 
  CheckCircle, 
  Lightbulb,
  BarChart3,
  PieChart,
  Calendar,
  DollarSign
} from "lucide-react";

export default function Insights() {
  const [timeframe, setTimeframe] = useState("6");

  const { data: insights, isLoading } = useQuery({
    queryKey: ["insights", timeframe],
    queryFn: () => backend.finance.getInsights({ months: parseInt(timeframe) }),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-red-600" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-green-600" />;
      default:
        return <div className="h-4 w-4" />;
    }
  };

  const getPerformanceIcon = (performance: string) => {
    switch (performance) {
      case "excellent":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "good":
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case "over":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <div className="h-4 w-4" />;
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case "budget":
        return <Target className="h-4 w-4 text-blue-600" />;
      case "savings":
        return <DollarSign className="h-4 w-4 text-green-600" />;
      case "category":
        return <PieChart className="h-4 w-4 text-purple-600" />;
      case "goal":
        return <Target className="h-4 w-4 text-orange-600" />;
      default:
        return <Lightbulb className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Insights</h1>
          <p className="text-gray-600 mt-2">Discover patterns and get personalized recommendations</p>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Timeframe:</label>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 months</SelectItem>
              <SelectItem value="6">6 months</SelectItem>
              <SelectItem value="12">12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Analyzing your financial data...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Avg Monthly Income</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(insights?.summary.averageMonthlyIncome || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Avg Monthly Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(insights?.summary.averageMonthlyExpenses || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Savings Rate</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${(insights?.summary.savingsRate || 0) >= 20 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {(insights?.summary.savingsRate || 0).toFixed(1)}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Top Category</CardTitle>
                <PieChart className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-purple-600">
                  {insights?.summary.topSpendingCategory || "None"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Personalized Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lightbulb className="h-5 w-5 text-yellow-600" />
                <span>Personalized Recommendations</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights?.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start space-x-3 p-4 border rounded-lg">
                    {getRecommendationIcon(rec.type)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium">{rec.title}</h4>
                        <Badge className={getPriorityColor(rec.priority)}>
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{rec.description}</p>
                      {rec.amount && (
                        <p className="text-sm font-medium text-blue-600 mt-1">
                          Amount: {formatCurrency(rec.amount)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {!insights?.recommendations.length && (
                  <p className="text-gray-500 text-center py-4">
                    Great job! No recommendations at this time.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Category Comparisons */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <span>Category Trends</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights?.categoryComparisons.map((category) => (
                  <div key={category.categoryId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.categoryColor }}
                      />
                      <div>
                        <p className="font-medium">{category.categoryName}</p>
                        <p className="text-sm text-gray-500">
                          Current: {formatCurrency(category.currentPeriod)} | 
                          Previous: {formatCurrency(category.previousPeriod)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(category.trend)}
                      <span className={`font-medium ${
                        category.trend === "up" ? "text-red-600" : 
                        category.trend === "down" ? "text-green-600" : "text-gray-600"
                      }`}>
                        {formatPercentage(category.changePercentage)}
                      </span>
                    </div>
                  </div>
                ))}
                {!insights?.categoryComparisons.length && (
                  <p className="text-gray-500 text-center py-4">
                    No category data available for comparison
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Budget Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-green-600" />
                <span>Budget Performance</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {insights?.budgetPerformance.map((budget) => (
                  <div key={budget.categoryId} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getPerformanceIcon(budget.performance)}
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: budget.categoryColor }}
                        />
                        <span className="font-medium">{budget.categoryName}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {formatCurrency(budget.spentAmount)} / {formatCurrency(budget.budgetAmount)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {budget.utilizationPercentage.toFixed(1)}% used
                        </div>
                      </div>
                    </div>
                    
                    <Progress
                      value={Math.min(budget.utilizationPercentage, 100)}
                      className={`h-3 ${
                        budget.performance === "over" ? "bg-red-100" :
                        budget.performance === "warning" ? "bg-yellow-100" : ""
                      }`}
                    />
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Remaining: {formatCurrency(budget.remainingAmount)}</span>
                      {budget.daysRemaining !== undefined && (
                        <span>{budget.daysRemaining} days left</span>
                      )}
                    </div>
                    
                    {budget.projectedSpending && budget.projectedSpending > budget.budgetAmount && (
                      <div className="text-xs text-red-600">
                        Projected to exceed by {formatCurrency(budget.projectedSpending - budget.budgetAmount)}
                      </div>
                    )}
                  </div>
                ))}
                {!insights?.budgetPerformance.length && (
                  <p className="text-gray-500 text-center py-4">
                    No active budgets to analyze
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Spending Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                <span>Monthly Spending Trends</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights?.spendingTrends
                  .reduce((acc: any[], trend) => {
                    const existingMonth = acc.find(item => item.month === trend.month);
                    if (existingMonth) {
                      existingMonth.categories.push(trend);
                      existingMonth.total += trend.amount;
                    } else {
                      acc.push({
                        month: trend.month,
                        total: trend.amount,
                        categories: [trend],
                      });
                    }
                    return acc;
                  }, [])
                  .sort((a: any, b: any) => b.month.localeCompare(a.month))
                  .slice(0, 6)
                  .map((monthData: any) => (
                    <div key={monthData.month} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">
                          {new Date(monthData.month + '-01').toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                          })}
                        </h4>
                        <span className="font-medium text-red-600">
                          {formatCurrency(monthData.total)}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {monthData.categories
                          .sort((a: any, b: any) => b.amount - a.amount)
                          .slice(0, 3)
                          .map((category: any) => (
                            <div key={category.categoryId} className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: category.categoryColor }}
                                />
                                <span>{category.categoryName}</span>
                              </div>
                              <span>{formatCurrency(category.amount)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                {!insights?.spendingTrends.length && (
                  <p className="text-gray-500 text-center py-4">
                    No spending trends data available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
