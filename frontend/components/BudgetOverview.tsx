import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import backend from "~backend/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ExternalLink } from "lucide-react";

export default function BudgetOverview() {
  const { data: budgets } = useQuery({
    queryKey: ["budgets"],
    queryFn: () => backend.finance.listBudgets(),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Budget Overview</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link to="/budgets">
            View All <ExternalLink className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {budgets?.budgets.slice(0, 3).map((budget) => {
            const percentage = (budget.spent / budget.amount) * 100;
            const isOverBudget = percentage > 100;
            
            return (
              <div key={budget.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: budget.category.color }}
                    />
                    <span className="font-medium text-sm">{budget.category.name}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatCurrency(budget.spent)} / {formatCurrency(budget.amount)}
                  </span>
                </div>
                <Progress
                  value={Math.min(percentage, 100)}
                  className={`h-2 ${isOverBudget ? "bg-red-100" : ""}`}
                />
                {isOverBudget && (
                  <p className="text-xs text-red-600">
                    Over budget by {formatCurrency(budget.spent - budget.amount)}
                  </p>
                )}
              </div>
            );
          })}
          {!budgets?.budgets.length && (
            <p className="text-gray-500 text-center py-4">No budgets set up yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
