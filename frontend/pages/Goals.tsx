import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import backend from "~backend/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, Edit, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import GoalForm from "../components/GoalForm";
import UpdateGoalForm from "../components/UpdateGoalForm";

export default function Goals() {
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: goals, isLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: () => backend.finance.listGoals(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => backend.finance.deleteGoal({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast({ title: "Goal deleted successfully" });
    },
    onError: (error) => {
      console.error("Delete goal error:", error);
      toast({ 
        title: "Error", 
        description: "Failed to delete goal",
        variant: "destructive" 
      });
    },
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

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this goal?")) {
      deleteMutation.mutate(id);
    }
  };

  const getDaysRemaining = (targetDate?: Date) => {
    if (!targetDate) return null;
    const today = new Date();
    const target = new Date(targetDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Goals</h1>
          <p className="text-gray-600 mt-2">Track your progress towards financial milestones</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Goal
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals?.goals.map((goal) => {
            const percentage = (goal.currentAmount / goal.targetAmount) * 100;
            const isCompleted = percentage >= 100;
            const daysRemaining = getDaysRemaining(goal.targetDate);
            
            return (
              <Card key={goal.id} className={isCompleted ? "border-green-200 bg-green-50" : ""}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    {isCompleted && <CheckCircle className="h-5 w-5 text-green-600" />}
                    <span>{goal.name}</span>
                  </CardTitle>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingGoal(goal.id)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(goal.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progress</span>
                      <span className={isCompleted ? "text-green-600 font-medium" : ""}>
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={Math.min(percentage, 100)}
                      className={`h-3 ${isCompleted ? "bg-green-100" : ""}`}
                    />
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{formatCurrency(goal.currentAmount)}</span>
                      <span>{formatCurrency(goal.targetAmount)}</span>
                    </div>
                  </div>

                  {goal.description && (
                    <p className="text-sm text-gray-600">{goal.description}</p>
                  )}

                  <div className="space-y-1 text-xs text-gray-500">
                    {goal.targetDate && (
                      <div className="flex items-center justify-between">
                        <span>Target Date:</span>
                        <span>{formatDate(goal.targetDate)}</span>
                      </div>
                    )}
                    {daysRemaining !== null && (
                      <div className="flex items-center justify-between">
                        <span>Days Remaining:</span>
                        <span className={daysRemaining < 0 ? "text-red-600" : ""}>
                          {daysRemaining < 0 ? "Overdue" : `${daysRemaining} days`}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span>Remaining:</span>
                      <span>
                        {formatCurrency(Math.max(0, goal.targetAmount - goal.currentAmount))}
                      </span>
                    </div>
                  </div>

                  {isCompleted && (
                    <div className="flex items-center space-x-2 p-2 bg-green-100 rounded-md">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700 font-medium">
                        Goal completed!
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!goals?.goals.length && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No goals yet</h3>
            <p className="text-gray-600 mb-4">
              Set your first financial goal to start tracking your progress
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Goal
            </Button>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <GoalForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ["goals"] });
          }}
        />
      )}

      {editingGoal && (
        <UpdateGoalForm
          goalId={editingGoal}
          onClose={() => setEditingGoal(null)}
          onSuccess={() => {
            setEditingGoal(null);
            queryClient.invalidateQueries({ queryKey: ["goals"] });
          }}
        />
      )}
    </div>
  );
}
