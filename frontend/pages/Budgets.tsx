import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import backend from "~backend/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, Edit, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import BudgetForm from "../components/BudgetForm";
import UpdateBudgetForm from "../components/UpdateBudgetForm";

export default function Budgets() {
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: budgets, isLoading } = useQuery({
    queryKey: ["budgets"],
    queryFn: () => backend.finance.listBudgets(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => backend.finance.deleteBudget({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast({ title: "Budget deleted successfully" });
    },
    onError: (error) => {
      console.error("Delete budget error:", error);
      toast({ 
        title: "Error", 
        description: "Failed to delete budget",
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
    if (confirm("Are you sure you want to delete this budget?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (id: number) => {
    setEditingBudget(id);
  };

  const handleCloseEditForm = () => {
    setEditingBudget(null);
  };

  const handleEditSuccess = () => {
    setEditingBudget(null);
    queryClient.invalidateQueries({ queryKey: ["budgets"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Budgets</h1>
          <p className="text-gray-600 mt-2">Track your spending against your budget goals</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Budget
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets?.budgets.map((budget) => {
            const percentage = (budget.spent / budget.amount) * 100;
            const isOverBudget = percentage > 100;
            const isNearLimit = percentage > 80 && percentage <= 100;
            
            return (
              <Card key={budget.id} className={isOverBudget ? "border-red-200" : ""}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: budget.category.color }}
                    />
                    <CardTitle className="text-lg">{budget.category.name}</CardTitle>
                  </div>
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(budget.id)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(budget.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Spent</span>
                      <span className={isOverBudget ? "text-red-600 font-medium" : ""}>
                        {formatCurrency(budget.spent)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Budget</span>
                      <span>{formatCurrency(budget.amount)}</span>
                    </div>
                    <Progress
                      value={Math.min(percentage, 100)}
                      className={`h-3 ${
                        isOverBudget 
                          ? "bg-red-100" 
                          : isNearLimit 
                          ? "bg-yellow-100" 
                          : ""
                      }`}
                    />
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{percentage.toFixed(1)}% used</span>
                      <span className="capitalize">{budget.period}</span>
                    </div>
                  </div>

                  {isOverBudget && (
                    <div className="flex items-center space-x-2 p-2 bg-red-50 rounded-md">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-700">
                        Over budget by {formatCurrency(budget.spent - budget.amount)}
                      </span>
                    </div>
                  )}

                  {isNearLimit && !isOverBudget && (
                    <div className="flex items-center space-x-2 p-2 bg-yellow-50 rounded-md">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-700">
                        Approaching budget limit
                      </span>
                    </div>
                  )}

                  <div className="text-xs text-gray-500">
                    <div>Start: {formatDate(budget.startDate)}</div>
                    {budget.endDate && (
                      <div>End: {formatDate(budget.endDate)}</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!budgets?.budgets.length && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No budgets yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first budget to start tracking your spending
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Budget
            </Button>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <BudgetForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ["budgets"] });
          }}
        />
      )}

      {editingBudget && (
        <UpdateBudgetForm
          budgetId={editingBudget}
          onClose={handleCloseEditForm}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
