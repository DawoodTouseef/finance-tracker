import { useQuery } from "@tanstack/react-query";
import backend from "~backend/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, TrendingDown, Target, Calendar } from "lucide-react";
import ErrorBoundary from "../components/ErrorBoundary";
import RecentTransactions from "../components/RecentTransactions";
import BudgetOverview from "../components/BudgetOverview";
import GoalsProgress from "../components/GoalsProgress";
import BillsOverview from "../components/BillsOverview";

export default function Dashboard() {
  const { data: reports } = useQuery({
    queryKey: ["reports"],
    queryFn: () => backend.finance.getReports(),
  });

  const { data: goals } = useQuery({
    queryKey: ["goals"],
    queryFn: () => backend.finance.listGoals(),
  });

  const { data: bills } = useQuery({
    queryKey: ["bills"],
    queryFn: () => backend.finance.listBills(),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const pendingBills = bills?.bills.filter(b => b.status === "pending") || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Overview of your financial health</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Goals</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {goals?.goals.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Bills</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {pendingBills.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <ErrorBoundary>
            <RecentTransactions />
          </ErrorBoundary>
          <ErrorBoundary>
            <BudgetOverview />
          </ErrorBoundary>
        </div>
        <div className="space-y-6">
          <ErrorBoundary>
            <BillsOverview />
          </ErrorBoundary>
          <ErrorBoundary>
            <GoalsProgress />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}
