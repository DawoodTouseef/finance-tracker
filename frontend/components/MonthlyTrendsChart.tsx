import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface MonthlySummary {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

interface MonthlyTrendsChartProps {
  data: MonthlySummary[];
}

export default function MonthlyTrendsChart({ data }: MonthlyTrendsChartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  const maxAmount = Math.max(
    ...data.flatMap(d => [d.income, d.expenses]),
    1000 // minimum scale
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Monthly Trends</CardTitle>
        <BarChart3 className="h-4 w-4 text-gray-600" />
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <div className="space-y-6">
            {data.map((month) => (
              <div key={month.month} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{formatMonth(month.month)}</h4>
                  <div className="text-sm">
                    <span className={`font-medium ${month.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Net: {formatCurrency(month.net)}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {/* Income Bar */}
                  <div className="flex items-center space-x-3">
                    <div className="w-16 text-sm text-green-600">Income</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                      <div
                        className="bg-green-500 h-4 rounded-full"
                        style={{ width: `${(month.income / maxAmount) * 100}%` }}
                      />
                    </div>
                    <div className="w-20 text-sm text-right font-medium text-green-600">
                      {formatCurrency(month.income)}
                    </div>
                  </div>
                  
                  {/* Expenses Bar */}
                  <div className="flex items-center space-x-3">
                    <div className="w-16 text-sm text-red-600">Expenses</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-4 relative">
                      <div
                        className="bg-red-500 h-4 rounded-full"
                        style={{ width: `${(month.expenses / maxAmount) * 100}%` }}
                      />
                    </div>
                    <div className="w-20 text-sm text-right font-medium text-red-600">
                      {formatCurrency(month.expenses)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No monthly data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
