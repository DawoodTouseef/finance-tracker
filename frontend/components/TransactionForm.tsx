import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import backend from "~backend/client";
import type { CreateTransactionRequest } from "~backend/finance/create_transaction";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";

interface TransactionFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface FormErrors {
  description?: string;
  amount?: string;
  categoryId?: string;
  date?: string;
  recurringFrequency?: string;
  recurringEndDate?: string;
}

export default function TransactionForm({ onClose, onSuccess }: TransactionFormProps) {
  const [formData, setFormData] = useState<CreateTransactionRequest>({
    amount: 0,
    description: "",
    categoryId: 0,
    date: new Date(),
    isRecurring: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const { toast } = useToast();

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => backend.finance.listCategories(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateTransactionRequest) => backend.finance.createTransaction(data),
    onSuccess: () => {
      toast({ title: "Transaction created successfully" });
      onSuccess();
    },
    onError: (error: any) => {
      console.error("Create transaction error:", error);
      const message = error?.message || "Failed to create transaction";
      toast({ 
        title: "Error", 
        description: message,
        variant: "destructive" 
      });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.length > 255) {
      newErrors.description = "Description cannot exceed 255 characters";
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    } else if (formData.amount > 999999999.99) {
      newErrors.amount = "Amount cannot exceed 999,999,999.99";
    }

    if (!formData.categoryId) {
      newErrors.categoryId = "Please select a category";
    }

    if (!formData.date) {
      newErrors.date = "Date is required";
    } else {
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      if (formData.date > oneYearFromNow) {
        newErrors.date = "Date cannot be more than 1 year in the future";
      }
    }

    if (formData.isRecurring) {
      if (!formData.recurringFrequency) {
        newErrors.recurringFrequency = "Frequency is required for recurring transactions";
      }

      if (formData.recurringEndDate && formData.recurringEndDate <= formData.date) {
        newErrors.recurringEndDate = "End date must be after the transaction date";
      }
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

  const handleDescriptionChange = (value: string) => {
    setFormData({ ...formData, description: value });
    if (errors.description) {
      setErrors({ ...errors, description: undefined });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="Enter description"
              className={errors.description ? "border-red-500" : ""}
              required
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">{errors.description}</p>
            )}
          </div>

          <div>
            <Label htmlFor="amount">Amount</Label>
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
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories?.categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span>{category.name}</span>
                      <span className="text-xs text-gray-500">({category.type})</span>
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
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date.toISOString().split('T')[0]}
              onChange={(e) => {
                setFormData({ ...formData, date: new Date(e.target.value) });
                if (errors.date) {
                  setErrors({ ...errors, date: undefined });
                }
              }}
              className={errors.date ? "border-red-500" : ""}
              required
            />
            {errors.date && (
              <p className="text-sm text-red-600 mt-1">{errors.date}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="recurring"
              checked={formData.isRecurring}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, isRecurring: checked as boolean })
              }
            />
            <Label htmlFor="recurring">Recurring transaction</Label>
          </div>

          {formData.isRecurring && (
            <>
              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={formData.recurringFrequency || ""}
                  onValueChange={(value) => {
                    setFormData({ 
                      ...formData, 
                      recurringFrequency: value as "daily" | "weekly" | "monthly" | "yearly"
                    });
                    if (errors.recurringFrequency) {
                      setErrors({ ...errors, recurringFrequency: undefined });
                    }
                  }}
                >
                  <SelectTrigger className={errors.recurringFrequency ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
                {errors.recurringFrequency && (
                  <p className="text-sm text-red-600 mt-1">{errors.recurringFrequency}</p>
                )}
              </div>

              <div>
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.recurringEndDate?.toISOString().split('T')[0] || ""}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      recurringEndDate: e.target.value ? new Date(e.target.value) : undefined 
                    });
                    if (errors.recurringEndDate) {
                      setErrors({ ...errors, recurringEndDate: undefined });
                    }
                  }}
                  className={errors.recurringEndDate ? "border-red-500" : ""}
                />
                {errors.recurringEndDate && (
                  <p className="text-sm text-red-600 mt-1">{errors.recurringEndDate}</p>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
