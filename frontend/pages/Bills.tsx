import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import backend from "~backend/client";
import type { Bill } from "~backend/finance/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit, CheckCircle, AlertTriangle, Clock, Calendar } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import BillForm from "../components/BillForm";
import MarkBillPaidDialog from "../components/MarkBillPaidDialog";

export default function Bills() {
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [payingBill, setPayingBill] = useState<Bill | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bills, isLoading } = useQuery({
    queryKey: ["bills", statusFilter !== "all" ? { status: statusFilter } : {}],
    queryFn: () => backend.finance.listBills(statusFilter !== "all" ? { status: statusFilter } : {}),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => backend.finance.deleteBill({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["bill-reminders"] });
      toast({ title: "Bill deleted successfully" });
    },
    onError: (error: any) => {
      console.error("Delete bill error:", error);
      const message = error?.message || "Failed to delete bill";
      toast({ 
        title: "Error", 
        description: message,
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

  const getDaysUntilDue = (dueDate: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const timeDiff = due.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  };

  const getDaysText = (days: number) => {
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return "Due today";
    if (days === 1) return "Due tomorrow";
    return `Due in ${days} days`;
  };

  const getStatusIcon = (status: string, daysUntilDue: number) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "overdue":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return daysUntilDue <= 3 ? 
          <AlertTriangle className="h-4 w-4 text-yellow-600" /> : 
          <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  const getStatusColor = (status: string, daysUntilDue: number) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 border-green-200";
      case "overdue":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return daysUntilDue <= 3 ? 
          "bg-yellow-100 text-yellow-800 border-yellow-200" : 
          "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this bill?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleMarkPaid = (bill: Bill) => {
    setPayingBill(bill);
  };

  const handlePaymentSuccess = () => {
    setPayingBill(null);
    queryClient.invalidateQueries({ queryKey: ["bills"] });
    queryClient.invalidateQueries({ queryKey: ["bill-reminders"] });
  };

  const pendingBills = bills?.bills.filter(b => b.status === "pending") || [];
  const overdueBills = bills?.bills.filter(b => b.status === "overdue") || [];
  const paidBills = bills?.bills.filter(b => b.status === "paid") || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bills</h1>
          <p className="text-gray-600 mt-2">Manage your recurring bills and payment reminders</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Bill
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Bills</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{pendingBills.length}</div>
            <p className="text-xs text-gray-500">
              {formatCurrency(pendingBills.reduce((sum, bill) => sum + bill.amount, 0))} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Overdue Bills</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueBills.length}</div>
            <p className="text-xs text-gray-500">
              {formatCurrency(overdueBills.reduce((sum, bill) => sum + bill.amount, 0))} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Paid This Month</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{paidBills.length}</div>
            <p className="text-xs text-gray-500">
              {formatCurrency(paidBills.reduce((sum, bill) => sum + bill.amount, 0))} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center space-x-4">
        <label className="text-sm font-medium">Filter by status:</label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Bills</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bills List */}
      <Card>
        <CardHeader>
          <CardTitle>Bills ({bills?.bills.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading bills...</div>
          ) : (
            <div className="space-y-4">
              {bills?.bills.map((bill) => {
                const daysUntilDue = getDaysUntilDue(bill.nextDueDate);
                
                return (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: bill.category?.color }}
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{bill.name}</p>
                          <Badge className={getStatusColor(bill.status, daysUntilDue)}>
                            {getStatusIcon(bill.status, daysUntilDue)}
                            <span className="ml-1 capitalize">{bill.status}</span>
                          </Badge>
                          {bill.autoPayEnabled && (
                            <Badge variant="outline" className="text-xs">
                              Auto-detect
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span>{bill.category?.name}</span>
                          <span>•</span>
                          <span className="capitalize">{bill.frequency}</span>
                          <span>•</span>
                          <span>{formatDate(bill.nextDueDate)}</span>
                          {bill.status !== "paid" && (
                            <>
                              <span>•</span>
                              <span className={daysUntilDue < 0 ? "text-red-600" : daysUntilDue <= 3 ? "text-yellow-600" : ""}>
                                {getDaysText(daysUntilDue)}
                              </span>
                            </>
                          )}
                        </div>
                        {bill.description && (
                          <p className="text-xs text-gray-500 mt-1">{bill.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <span className="font-medium text-lg">
                        {formatCurrency(bill.amount)}
                      </span>
                      
                      <div className="flex space-x-1">
                        {bill.status !== "paid" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkPaid(bill)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {/* TODO: Edit functionality */}}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(bill.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {!bills?.bills.length && (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium">No bills yet</h3>
                  <p>Start by adding your first recurring bill</p>
                  <Button onClick={() => setShowForm(true)} className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Bill
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <BillForm
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ["bills"] });
            queryClient.invalidateQueries({ queryKey: ["bill-reminders"] });
          }}
        />
      )}

      {payingBill && (
        <MarkBillPaidDialog
          bill={payingBill}
          onClose={() => setPayingBill(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
