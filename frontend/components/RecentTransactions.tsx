import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import backend from "~backend/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, ExternalLink } from "lucide-react";

export default function RecentTransactions() {
  const { data: transactions } = useQuery({
    queryKey: ["transactions", { limit: 5 }],
    queryFn: () => backend.finance.listTransactions({ limit: 5 }),
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Transactions</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <Link to="/transactions">
            View All <ExternalLink className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions?.transactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: transaction.category.color }}
                />
                <div>
                  <p className="font-medium text-sm">{transaction.description}</p>
                  <p className="text-xs text-gray-500">{transaction.category.name}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">
                  {formatDate(transaction.date)}
                </span>
                <div className="flex items-center">
                  {transaction.category.type === "income" ? (
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                  )}
                  <span
                    className={`font-medium ${
                      transaction.category.type === "income"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(transaction.amount)}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {!transactions?.transactions.length && (
            <p className="text-gray-500 text-center py-4">No transactions yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
