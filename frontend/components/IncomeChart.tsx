import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface CategorySummary {
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  total: number;
  transactionCount: number;
}

interface IncomeChartProps {
  data: CategorySummary[];
}

export default function IncomeChart({ data }: IncomeChartProps) {
  const total = data.reduce((sum, item) => sum + item.total, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Income by Category</CardTitle>
        <TrendingUp className="h-4 w-4 text-gray-600" />
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="space-y-4">
            {/* Simple bar chart representation */}
            <div className="space-y-3">
              {data.map((category) => {
                const percentage = total > 0 ? (category.total / total) * 100 : 0;
                return (
                  <div key={category.categoryId} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.categoryColor }}
                        />
                        <span>{category.categoryName}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(category.total)}</div>
                        <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          backgroundColor: category.categoryColor,
                          width: `${percentage}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between font-medium">
                <span>Total Income</span>
                <span className="text-green-600">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No income data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
