import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import backend from "~backend/client";
import type { CreateGoalRequest } from "~backend/finance/create_goal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

interface GoalFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface FormErrors {
  name?: string;
  targetAmount?: string;
  currentAmount?: string;
  targetDate?: string;
  description?: string;
}

export default function GoalForm({ onClose, onSuccess }: GoalFormProps) {
  const [formData, setFormData] = useState<CreateGoalRequest>({
    name: "",
    targetAmount: 0,
    currentAmount: 0,
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: (data: CreateGoalRequest) => backend.finance.createGoal(data),
    onSuccess: () => {
      toast({ title: "Goal created successfully" });
      onSuccess();
    },
    onError: (error: any) => {
      console.error("Create goal error:", error);
      const message = error?.message || "Failed to create goal";
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

    if (!formData.targetAmount || formData.targetAmount <= 0) {
      newErrors.targetAmount = "Target amount must be greater than 0";
    } else if (formData.targetAmount > 999999999.99) {
      newErrors.targetAmount = "Target amount cannot exceed 999,999,999.99";
    }

    if (formData.currentAmount !== undefined) {
      if (formData.currentAmount < 0) {
        newErrors.currentAmount = "Current amount cannot be negative";
      } else if (formData.currentAmount > 999999999.99) {
        newErrors.currentAmount = "Current amount cannot exceed 999,999,999.99";
      }
    }

    if (formData.targetDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (formData.targetDate < today) {
        newErrors.targetDate = "Target date cannot be in the past";
      } else {
        const fiftyYearsFromNow = new Date();
        fiftyYearsFromNow.setFullYear(fiftyYearsFromNow.getFullYear() + 50);
        if (formData.targetDate > fiftyYearsFromNow) {
          newErrors.targetDate = "Target date cannot be more than 50 years in the future";
        }
      }
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

  const handleTargetAmountChange = (value: string) => {
    const numValue = parseFloat(value);
    setFormData({ ...formData, targetAmount: isNaN(numValue) ? 0 : numValue });
    if (errors.targetAmount) {
      setErrors({ ...errors, targetAmount: undefined });
    }
  };

  const handleCurrentAmountChange = (value: string) => {
    const numValue = parseFloat(value);
    setFormData({ ...formData, currentAmount: isNaN(numValue) ? 0 : numValue });
    if (errors.currentAmount) {
      setErrors({ ...errors, currentAmount: undefined });
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Financial Goal</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Goal Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Emergency Fund, Vacation, New Car"
              className={errors.name ? "border-red-500" : ""}
              maxLength={255}
              required
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="targetAmount">Target Amount</Label>
            <Input
              id="targetAmount"
              type="number"
              step="0.01"
              min="0.01"
              max="999999999.99"
              value={formData.targetAmount || ""}
              onChange={(e) => handleTargetAmountChange(e.target.value)}
              placeholder="0.00"
              className={errors.targetAmount ? "border-red-500" : ""}
              required
            />
            {errors.targetAmount && (
              <p className="text-sm text-red-600 mt-1">{errors.targetAmount}</p>
            )}
          </div>

          <div>
            <Label htmlFor="currentAmount">Current Amount</Label>
            <Input
              id="currentAmount"
              type="number"
              step="0.01"
              min="0"
              max="999999999.99"
              value={formData.currentAmount || ""}
              onChange={(e) => handleCurrentAmountChange(e.target.value)}
              placeholder="0.00"
              className={errors.currentAmount ? "border-red-500" : ""}
            />
            {errors.currentAmount && (
              <p className="text-sm text-red-600 mt-1">{errors.currentAmount}</p>
            )}
          </div>

          <div>
            <Label htmlFor="targetDate">Target Date (Optional)</Label>
            <Input
              id="targetDate"
              type="date"
              value={formData.targetDate?.toISOString().split('T')[0] || ""}
              onChange={(e) => {
                setFormData({ 
                  ...formData, 
                  targetDate: e.target.value ? new Date(e.target.value) : undefined 
                });
                if (errors.targetDate) {
                  setErrors({ ...errors, targetDate: undefined });
                }
              }}
              className={errors.targetDate ? "border-red-500" : ""}
            />
            {errors.targetDate && (
              <p className="text-sm text-red-600 mt-1">{errors.targetDate}</p>
            )}
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
              placeholder="Add notes about this goal..."
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
              {createMutation.isPending ? "Creating..." : "Create Goal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
