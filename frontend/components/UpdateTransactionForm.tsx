import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import backend from "~backend/client";
import type { UpdateTransactionRequest } from "~backend/finance/update_transaction";
import type { Transaction } from "~backend/finance/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";

interface UpdateTransactionFormProps {
  transaction: Transaction;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UpdateTransactionForm({ transaction, onClose, onSuccess }: UpdateTransactionFormProps) {
  const [formData, setFormData] = useState<UpdateTransactionRequest>({});
  const { toast } = useToast();

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => backend.finance.listCategories(),
  });

  useEffect(() => {
    setFormData({
      amount: transaction.amount,
      description: transaction.description,
      categoryId: transaction.categoryId,
      date: transaction.date,
      isRecurring: transaction.isRecurring,
      recurringFrequency: transaction.recurringFrequency,
      recurringEndDate: transaction.recurringEndDate,
    });
  }, [transaction]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateTransactionRequest) => 
      backend.finance.updateTransaction({ id: transaction.id, ...data }),
    onSuccess: () => {
      toast({ title: "Transaction updated successfully" });
      onSuccess();
    },
    onError: (error) => {
      console.error("Update transaction error:", error);
      toast({ 
        title: "Error", 
        description: "Failed to update transaction",
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.categoryId) {
      toast({ 
        title: "Error", 
        description: "Please select a category",
        variant: "destructive" 
      });
      return;
    }
    updateMutation.mutate(formData);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Transaction</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter description"
              required
            />
          </div>

          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount || ""}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.categoryId ? formData.categoryId.toString() : ""}
              onValueChange={(value) => setFormData({ ...formData, categoryId: parseInt(value) })}
            >
              <SelectTrigger>
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
          </div>

          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date?.toISOString().split('T')[0] || ""}
              onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value) })}
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="recurring"
              checked={formData.isRecurring || false}
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
                  onValueChange={(value) => 
                    setFormData({ 
                      ...formData, 
                      recurringFrequency: value as "daily" | "weekly" | "monthly" | "yearly"
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.recurringEndDate?.toISOString().split('T')[0] || ""}
                  onChange={(e) => 
                    setFormData({ 
                      ...formData, 
                      recurringEndDate: e.target.value ? new Date(e.target.value) : undefined 
                    })
                  }
                />
              </div>
            </>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Updating..." : "Update Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
