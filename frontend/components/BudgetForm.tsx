import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import backend from "~backend/client";
import type { CreateBudgetRequest } from "~backend/finance/create_budget";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

interface BudgetFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface FormErrors {
  categoryId?: string;
  amount?: string;
  period?: string;
  startDate?: string;
  endDate?: string;
}

export default function BudgetForm({ onClose, onSuccess }: BudgetFormProps) {
  const [formData, setFormData] = useState<CreateBudgetRequest>({
    categoryId: 0,
    amount: 0,
    period: "monthly",
    startDate: new Date(),
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const { toast } = useToast();

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => backend.finance.listCategories(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateBudgetRequest) => backend.finance.createBudget(data),
    onSuccess: () => {
      toast({ title: "Budget created successfully" });
      onSuccess();
    },
    onError: (error: any) => {
      console.error("Create budget error:", error);
      const message = error?.message || "Failed to create budget";
      toast({ 
        title: "Error", 
        description: message,
        variant: "destructive" 
      });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.categoryId) {
      newErrors.categoryId = "Please select a category";
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    } else if (formData.amount > 999999999.99) {
      newErrors.amount = "Amount cannot exceed 999,999,999.99";
    }

    if (!formData.period || !["monthly", "yearly"].includes(formData.period)) {
      newErrors.period = "Please select a valid period";
    }

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    }

    if (formData.endDate && formData.endDate <= formData.startDate) {
      newErrors.endDate = "End date must be after start date";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      createMutation.mutate(formData);
    }
  };

  const handleAmountChange = (value: string) => {
    const numValue = parseFloat(value);
    setFormData({ ...formData, amount: isNaN(numValue) ? 0 : numValue });
    if (errors.amount) {
      setErrors({ ...errors, amount: undefined });
    }
  };

  // Filter to only show expense categories
  const expenseCategories = categories?.categories.filter(cat => cat.type === "expense") || [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Budget</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.categoryId ? formData.categoryId.toString() : ""}
              onValueChange={(value) => {
                setFormData({ ...formData, categoryId: parseInt(value) });
                if (errors.categoryId) {
                  setErrors({ ...errors, categoryId: undefined });
                }
              }}
            >
              <SelectTrigger className={errors.categoryId ? "border-red-500" : ""}>
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
            {errors.categoryId && (
              <p className="text-sm text-red-600 mt-1">{errors.categoryId}</p>
            )}
          </div>

          <div>
            <Label htmlFor="amount">Budget Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max="999999999.99"
              value={formData.amount || ""}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.00"
              className={errors.amount ? "border-red-500" : ""}
              required
            />
            {errors.amount && (
              <p className="text-sm text-red-600 mt-1">{errors.amount}</p>
            )}
          </div>

          <div>
            <Label htmlFor="period">Period</Label>
            <Select
              value={formData.period}
              onValueChange={(value) => {
                setFormData({ ...formData, period: value as "monthly" | "yearly" });
                if (errors.period) {
                  setErrors({ ...errors, period: undefined });
                }
              }}
            >
              <SelectTrigger className={errors.period ? "border-red-500" : ""}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            {errors.period && (
              <p className="text-sm text-red-600 mt-1">{errors.period}</p>
            )}
          </div>

          <div>
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate.toISOString().split('T')[0]}
              onChange={(e) => {
                setFormData({ ...formData, startDate: new Date(e.target.value) });
                if (errors.startDate) {
                  setErrors({ ...errors, startDate: undefined });
                }
              }}
              className={errors.startDate ? "border-red-500" : ""}
              required
            />
            {errors.startDate && (
              <p className="text-sm text-red-600 mt-1">{errors.startDate}</p>
            )}
          </div>

          <div>
            <Label htmlFor="endDate">End Date (Optional)</Label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDate?.toISOString().split('T')[0] || ""}
              onChange={(e) => {
                setFormData({ 
                  ...formData, 
                  endDate: e.target.value ? new Date(e.target.value) : undefined 
                });
                if (errors.endDate) {
                  setErrors({ ...errors, endDate: undefined });
                }
              }}
              className={errors.endDate ? "border-red-500" : ""}
            />
            {errors.endDate && (
              <p className="text-sm text-red-600 mt-1">{errors.endDate}</p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Budget"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
