import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import backend from "~backend/client";
import type { UpdateGoalRequest } from "~backend/finance/update_goal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

interface UpdateGoalFormProps {
  goalId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UpdateGoalForm({ goalId, onClose, onSuccess }: UpdateGoalFormProps) {
  const [formData, setFormData] = useState<UpdateGoalRequest>({});
  const { toast } = useToast();

  const { data: goals } = useQuery({
    queryKey: ["goals"],
    queryFn: () => backend.finance.listGoals(),
  });

  const goal = goals?.goals.find(g => g.id === goalId);

  useEffect(() => {
    if (goal) {
      setFormData({
        name: goal.name,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        targetDate: goal.targetDate,
        description: goal.description,
      });
    }
  }, [goal]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateGoalRequest) => backend.finance.updateGoal({ id: goalId, ...data }),
    onSuccess: () => {
      toast({ title: "Goal updated successfully" });
      onSuccess();
    },
    onError: (error) => {
      console.error("Update goal error:", error);
      toast({ 
        title: "Error", 
        description: "Failed to update goal",
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (!goal) {
    return null;
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Goal</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Goal Name</Label>
            <Input
              id="name"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Emergency Fund, Vacation, New Car"
            />
          </div>

          <div>
            <Label htmlFor="targetAmount">Target Amount</Label>
            <Input
              id="targetAmount"
              type="number"
              step="0.01"
              value={formData.targetAmount || ""}
              onChange={(e) => setFormData({ ...formData, targetAmount: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="currentAmount">Current Amount</Label>
            <Input
              id="currentAmount"
              type="number"
              step="0.01"
              value={formData.currentAmount || ""}
              onChange={(e) => setFormData({ ...formData, currentAmount: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="targetDate">Target Date</Label>
            <Input
              id="targetDate"
              type="date"
              value={formData.targetDate?.toISOString().split('T')[0] || ""}
              onChange={(e) => 
                setFormData({ 
                  ...formData, 
                  targetDate: e.target.value ? new Date(e.target.value) : undefined 
                })
              }
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value || undefined })}
              placeholder="Add notes about this goal..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Goal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
