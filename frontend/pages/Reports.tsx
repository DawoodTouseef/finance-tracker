import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import backend from "~backend/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp, TrendingDown, DollarSign, PieChart } from "lucide-react";
import ExpenseChart from "../components/ExpenseChart";
import IncomeChart from "../components/IncomeChart";
import MonthlyTrendsChart from "../components/MonthlyTrendsChart";

export default function Reports() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const { data: reports, isLoading } = useQuery({
    queryKey: ["reports", dateRange],
    queryFn: () => backend.finance.getReports(dateRange),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleDateRangeChange = (field: string, value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-gray-600 mt-2">Analyze your financial patterns and trends</p>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange("startDate", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange("endDate", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-8">Loading reports...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Income</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(reports?.totalIncome || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(reports?.totalExpenses || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Net Income</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${(reports?.netIncome || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(reports?.netIncome || 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ExpenseChart data={reports?.expensesByCategory || []} />
            <IncomeChart data={reports?.incomeByCategory || []} />
          </div>

          <MonthlyTrendsChart data={reports?.monthlyTrends || []} />

          {/* Category Breakdown Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Expenses Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reports?.expensesByCategory.map((category) => (
                    <div key={category.categoryId} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.categoryColor }}
                        />
                        <div>
                          <p className="font-medium text-sm">{category.categoryName}</p>
                          <p className="text-xs text-gray-500">
                            {category.transactionCount} transactions
                          </p>
                        </div>
                      </div>
                      <span className="font-medium text-red-600">
                        {formatCurrency(category.total)}
                      </span>
                    </div>
                  ))}
                  {!reports?.expensesByCategory.length && (
                    <p className="text-gray-500 text-center py-4">No expenses in this period</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Income Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Income by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reports?.incomeByCategory.map((category) => (
                    <div key={category.categoryId} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.categoryColor }}
                        />
                        <div>
                          <p className="font-medium text-sm">{category.categoryName}</p>
                          <p className="text-xs text-gray-500">
                            {category.transactionCount} transactions
                          </p>
                        </div>
                      </div>
                      <span className="font-medium text-green-600">
                        {formatCurrency(category.total)}
                      </span>
                    </div>
                  ))}
                  {!reports?.incomeByCategory.length && (
                    <p className="text-gray-500 text-center py-4">No income in this period</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
