import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import backend from "~backend/client";
import type { UpdateBudgetRequest } from "~backend/finance/update_budget";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

interface UpdateBudgetFormProps {
  budgetId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UpdateBudgetForm({ budgetId, onClose, onSuccess }: UpdateBudgetFormProps) {
  const [formData, setFormData] = useState<UpdateBudgetRequest>({});
  const { toast } = useToast();

  const { data: budgets } = useQuery({
    queryKey: ["budgets"],
    queryFn: () => backend.finance.listBudgets(),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => backend.finance.listCategories(),
  });

  const budget = budgets?.budgets.find(b => b.id === budgetId);

  useEffect(() => {
    if (budget) {
      setFormData({
        categoryId: budget.categoryId,
        amount: budget.amount,
        period: budget.period,
        startDate: budget.startDate,
        endDate: budget.endDate,
      });
    }
  }, [budget]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateBudgetRequest) => backend.finance.updateBudget({ id: budgetId, ...data }),
    onSuccess: () => {
      toast({ title: "Budget updated successfully" });
      onSuccess();
    },
    onError: (error) => {
      console.error("Update budget error:", error);
      toast({ 
        title: "Error", 
        description: "Failed to update budget",
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (!budget) {
    return null;
  }

  // Filter to only show expense categories
  const expenseCategories = categories?.categories.filter(cat => cat.type === "expense") || [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Budget</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.categoryId ? formData.categoryId.toString() : ""}
              onValueChange={(value) => setFormData({ ...formData, categoryId: parseInt(value) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select expense category" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span>{category.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">Budget Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount || ""}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="period">Period</Label>
            <Select
              value={formData.period || ""}
              onValueChange={(value) => 
                setFormData({ ...formData, period: value as "monthly" | "yearly" })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate?.toISOString().split('T')[0] || ""}
              onChange={(e) => setFormData({ ...formData, startDate: new Date(e.target.value) })}
            />
          </div>

          <div>
            <Label htmlFor="endDate">End Date (Optional)</Label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDate?.toISOString().split('T')[0] || ""}
              onChange={(e) => 
                setFormData({ 
                  ...formData, 
                  endDate: e.target.value ? new Date(e.target.value) : undefined 
                })
              }
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Budget"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
