import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import backend from "~backend/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ExternalLink } from "lucide-react";

export default function GoalsProgress() {
  const { data: goals } = useQuery({
    queryKey: ["goals"],
    queryFn: () => backend.finance.listGoals(),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Financial Goals</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link to="/goals">
            View All <ExternalLink className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {goals?.goals.map((goal) => {
            const percentage = (goal.currentAmount / goal.targetAmount) * 100;
            const isCompleted = percentage >= 100;
            
            return (
              <div key={goal.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{goal.name}</h4>
                  <span className={`text-sm ${isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                    {percentage.toFixed(0)}%
                  </span>
                </div>
                
                <Progress
                  value={Math.min(percentage, 100)}
                  className={`h-3 ${isCompleted ? "bg-green-100" : ""}`}
                />
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>
                    {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                  </span>
                  {goal.targetDate && (
                    <span>Due: {formatDate(goal.targetDate)}</span>
                  )}
                </div>
                
                {goal.description && (
                  <p className="text-sm text-gray-600">{goal.description}</p>
                )}
              </div>
            );
          })}
          {!goals?.goals.length && (
            <p className="text-gray-500 text-center py-4">No goals set up yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
