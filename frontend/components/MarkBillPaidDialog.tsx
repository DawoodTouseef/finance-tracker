import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import backend from "~backend/client";
import type { MarkBillPaidRequest } from "~backend/finance/mark_bill_paid";
import type { Bill } from "~backend/finance/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

interface MarkBillPaidDialogProps {
  bill: Bill;
  onClose: () => void;
  onSuccess: () => void;
}

export default function MarkBillPaidDialog({ bill, onClose, onSuccess }: MarkBillPaidDialogProps) {
  const [formData, setFormData] = useState<MarkBillPaidRequest>({
    amount: bill.amount,
    paidDate: new Date(),
  });

  const { toast } = useToast();

  const markPaidMutation = useMutation({
    mutationFn: (data: MarkBillPaidRequest) => 
      backend.finance.markBillPaid({ id: bill.id, ...data }),
    onSuccess: () => {
      toast({ title: "Bill marked as paid successfully" });
      onSuccess();
    },
    onError: (error: any) => {
      console.error("Mark bill paid error:", error);
      const message = error?.message || "Failed to mark bill as paid";
      toast({ 
        title: "Error", 
        description: message,
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || formData.amount <= 0) {
      toast({ 
        title: "Error", 
        description: "Amount must be greater than 0",
        variant: "destructive" 
      });
      return;
    }
    markPaidMutation.mutate(formData);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Bill as Paid</DialogTitle>
        </DialogHeader>
        
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: bill.category?.color }}
            />
            <span className="font-medium">{bill.name}</span>
          </div>
          <p className="text-sm text-gray-600">
            Due: {new Date(bill.nextDueDate).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <p className="text-sm text-gray-600">
            Amount: {formatCurrency(bill.amount)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount">Payment Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={formData.amount || ""}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <Label htmlFor="paidDate">Payment Date</Label>
            <Input
              id="paidDate"
              type="date"
              value={formData.paidDate?.toISOString().split('T')[0] || ""}
              onChange={(e) => setFormData({ ...formData, paidDate: new Date(e.target.value) })}
              required
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value || undefined })}
              placeholder="Add any notes about this payment..."
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={markPaidMutation.isPending}>
              {markPaidMutation.isPending ? "Marking Paid..." : "Mark as Paid"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
