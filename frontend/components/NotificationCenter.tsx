import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import backend from "~backend/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, AlertCircle, X } from "lucide-react";

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<number>>(new Set());

  const { data: alerts } = useQuery({
    queryKey: ["budget-alerts"],
    queryFn: () => backend.finance.getBudgetAlerts(),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const activeAlerts = alerts?.alerts.filter(alert => !dismissedAlerts.has(alert.budgetId)) || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "exceeded":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "danger":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case "exceeded":
        return "border-red-200 bg-red-50";
      case "danger":
        return "border-orange-200 bg-orange-50";
      case "warning":
        return "border-yellow-200 bg-yellow-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  const dismissAlert = (budgetId: number) => {
    setDismissedAlerts(prev => new Set([...prev, budgetId]));
  };

  if (activeAlerts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {activeAlerts.length > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
          >
            {activeAlerts.length}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute top-12 right-0 w-80 max-h-96 overflow-y-auto shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Budget Alerts</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeAlerts.map((alert) => (
              <div
                key={alert.budgetId}
                className={`p-3 rounded-lg border ${getAlertColor(alert.alertType)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2">
                    {getAlertIcon(alert.alertType)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: alert.categoryColor }}
                        />
                        <span className="font-medium text-sm">{alert.categoryName}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {alert.alertType === "exceeded" && (
                          <>Budget exceeded! Spent {formatCurrency(alert.spentAmount)} of {formatCurrency(alert.budgetAmount)}</>
                        )}
                        {alert.alertType === "danger" && (
                          <>Approaching budget limit: {alert.percentage.toFixed(1)}% used</>
                        )}
                        {alert.alertType === "warning" && (
                          <>Budget warning: {alert.percentage.toFixed(1)}% used</>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissAlert(alert.budgetId)}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
