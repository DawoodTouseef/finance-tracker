import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import backend from "~backend/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Calendar, AlertTriangle, Clock } from "lucide-react";

export default function BillsOverview() {
  const { data: bills } = useQuery({
    queryKey: ["bills", { dueSoon: true }],
    queryFn: () => backend.finance.listBills({ dueSoon: true }),
  });

  const { data: reminders } = useQuery({
    queryKey: ["bill-reminders"],
    queryFn: () => backend.finance.getBillReminders(),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
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
    });
  };

  const getDaysText = (days: number) => {
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return "Due today";
    if (days === 1) return "Due tomorrow";
    return `Due in ${days} days`;
  };

  const getStatusColor = (days: number) => {
    if (days < 0) return "text-red-600";
    if (days <= 1) return "text-orange-600";
    if (days <= 3) return "text-yellow-600";
    return "text-gray-600";
  };

  const upcomingBills = reminders?.reminders.slice(0, 5) || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>Upcoming Bills</span>
        </CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link to="/bills">
            View All <ExternalLink className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {upcomingBills.map((reminder) => (
            <div key={reminder.billId} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: reminder.categoryColor }}
                />
                <div>
                  <p className="font-medium text-sm">{reminder.billName}</p>
                  <p className="text-xs text-gray-500">{reminder.categoryName}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-sm">{formatCurrency(reminder.amount)}</div>
                <div className={`text-xs flex items-center space-x-1 ${getStatusColor(reminder.daysUntilDue)}`}>
                  {reminder.isOverdue ? (
                    <AlertTriangle className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  <span>{getDaysText(reminder.daysUntilDue)}</span>
                </div>
              </div>
            </div>
          ))}
          {upcomingBills.length === 0 && (
            <p className="text-gray-500 text-center py-4">No upcoming bills</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
