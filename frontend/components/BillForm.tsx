import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import backend from "~backend/client";
import type { CreateBillRequest } from "~backend/finance/create_bill";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

interface BillFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface FormErrors {
  name?: string;
  amount?: string;
  categoryId?: string;
  dueDate?: string;
  frequency?: string;
  reminderDays?: string;
  description?: string;
}

export default function BillForm({ onClose, onSuccess }: BillFormProps) {
  const [formData, setFormData] = useState<CreateBillRequest>({
    name: "",
    amount: 0,
    categoryId: 0,
    dueDate: new Date(),
    frequency: "monthly",
    autoPayEnabled: false,
    reminderDays: 3,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const { toast } = useToast();

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => backend.finance.listCategories(),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateBillRequest) => backend.finance.createBill(data),
    onSuccess: () => {
      toast({ title: "Bill created successfully" });
      onSuccess();
    },
    onError: (error: any) => {
      console.error("Create bill error:", error);
      const message = error?.message || "Failed to create bill";
      toast({ 
        title: "Error", 
        description: message,
        variant: "destructive" 
      });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.length > 255) {
      newErrors.name = "Name cannot exceed 255 characters";
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = "Amount must be greater than 0";
    } else if (formData.amount > 999999999.99) {
      newErrors.amount = "Amount cannot exceed 999,999,999.99";
    }

    if (!formData.categoryId) {
      newErrors.categoryId = "Please select a category";
    }

    if (!formData.dueDate) {
      newErrors.dueDate = "Due date is required";
    }

    if (!formData.frequency || !["daily", "weekly", "monthly", "yearly"].includes(formData.frequency)) {
      newErrors.frequency = "Please select a valid frequency";
    }

    if (formData.reminderDays !== undefined && (formData.reminderDays < 0 || formData.reminderDays > 30)) {
      newErrors.reminderDays = "Reminder days must be between 0 and 30";
    }

    if (formData.description && formData.description.length > 1000) {
      newErrors.description = "Description cannot exceed 1000 characters";
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

  const handleNameChange = (value: string) => {
    setFormData({ ...formData, name: value });
    if (errors.name) {
      setErrors({ ...errors, name: undefined });
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
          <DialogTitle>Create Bill</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Bill Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Electric Bill, Rent, Internet"
              className={errors.name ? "border-red-500" : ""}
              maxLength={255}
              required
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name}</p>
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
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate.toISOString().split('T')[0]}
              onChange={(e) => {
                setFormData({ ...formData, dueDate: new Date(e.target.value) });
                if (errors.dueDate) {
                  setErrors({ ...errors, dueDate: undefined });
                }
              }}
              className={errors.dueDate ? "border-red-500" : ""}
              required
            />
            {errors.dueDate && (
              <p className="text-sm text-red-600 mt-1">{errors.dueDate}</p>
            )}
          </div>

          <div>
            <Label htmlFor="frequency">Frequency</Label>
            <Select
              value={formData.frequency}
              onValueChange={(value) => {
                setFormData({ ...formData, frequency: value as "daily" | "weekly" | "monthly" | "yearly" });
                if (errors.frequency) {
                  setErrors({ ...errors, frequency: undefined });
                }
              }}
            >
              <SelectTrigger className={errors.frequency ? "border-red-500" : ""}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
            {errors.frequency && (
              <p className="text-sm text-red-600 mt-1">{errors.frequency}</p>
            )}
          </div>

          <div>
            <Label htmlFor="reminderDays">Reminder Days</Label>
            <Input
              id="reminderDays"
              type="number"
              min="0"
              max="30"
              value={formData.reminderDays || ""}
              onChange={(e) => {
                const value = parseInt(e.target.value);
                setFormData({ ...formData, reminderDays: isNaN(value) ? 3 : value });
                if (errors.reminderDays) {
                  setErrors({ ...errors, reminderDays: undefined });
                }
              }}
              className={errors.reminderDays ? "border-red-500" : ""}
            />
            <p className="text-xs text-gray-500 mt-1">
              Number of days before due date to show reminders
            </p>
            {errors.reminderDays && (
              <p className="text-sm text-red-600 mt-1">{errors.reminderDays}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoPayEnabled"
              checked={formData.autoPayEnabled}
              onCheckedChange={(checked) => 
                setFormData({ ...formData, autoPayEnabled: checked as boolean })
              }
            />
            <Label htmlFor="autoPayEnabled">Enable auto-detection of payments</Label>
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => {
                setFormData({ ...formData, description: e.target.value || undefined });
                if (errors.description) {
                  setErrors({ ...errors, description: undefined });
                }
              }}
              placeholder="Add notes about this bill..."
              className={errors.description ? "border-red-500" : ""}
              maxLength={1000}
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">{errors.description}</p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Bill"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
