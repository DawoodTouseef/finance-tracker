import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import backend from "~backend/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Download, FileText, CheckCircle } from "lucide-react";

interface CsvExportDialogProps {
  onClose: () => void;
}

interface ExportFilters {
  startDate?: string;
  endDate?: string;
  categoryIds?: number[];
  includeRecurring: boolean;
}

export default function CsvExportDialog({ onClose }: CsvExportDialogProps) {
  const [filters, setFilters] = useState<ExportFilters>({
    includeRecurring: true,
  });
  const [exportResult, setExportResult] = useState<any>(null);

  const { toast } = useToast();

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => backend.finance.listCategories(),
  });

  const exportMutation = useMutation({
    mutationFn: (params: any) => backend.finance.exportCsv(params),
    onSuccess: (result) => {
      setExportResult(result);
      
      // Create and download the file
      const blob = new Blob([result.csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `${result.recordCount} transactions exported successfully`,
      });
    },
    onError: (error: any) => {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: error?.message || "Failed to export transactions",
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    const params: any = {
      includeRecurring: filters.includeRecurring,
    };

    if (filters.startDate) {
      params.startDate = filters.startDate;
    }

    if (filters.endDate) {
      params.endDate = filters.endDate;
    }

    if (filters.categoryIds && filters.categoryIds.length > 0) {
      params.categoryIds = filters.categoryIds.join(',');
    }

    exportMutation.mutate(params);
  };

  const handleCategoryToggle = (categoryId: number) => {
    const currentCategories = filters.categoryIds || [];
    const newCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter(id => id !== categoryId)
      : [...currentCategories, categoryId];
    
    setFilters({
      ...filters,
      categoryIds: newCategories.length > 0 ? newCategories : undefined
    });
  };

  const incomeCategories = categories?.categories.filter(cat => cat.type === "income") || [];
  const expenseCategories = categories?.categories.filter(cat => cat.type === "expense") || [];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Transactions to CSV</DialogTitle>
        </DialogHeader>

        {!exportResult ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Export Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date">Start Date (Optional)</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={filters.startDate || ""}
                      onChange={(e) => 
                        setFilters({ ...filters, startDate: e.target.value || undefined })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">End Date (Optional)</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={filters.endDate || ""}
                      onChange={(e) => 
                        setFilters({ ...filters, endDate: e.target.value || undefined })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-recurring"
                    checked={filters.includeRecurring}
                    onCheckedChange={(checked) => 
                      setFilters({ ...filters, includeRecurring: checked as boolean })
                    }
                  />
                  <Label htmlFor="include-recurring">Include recurring transactions</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Categories (Optional)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Income Categories */}
                {incomeCategories.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-green-700 mb-2">Income Categories</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {incomeCategories.map((category) => (
                        <div key={category.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`income-${category.id}`}
                            checked={filters.categoryIds?.includes(category.id) || false}
                            onCheckedChange={() => handleCategoryToggle(category.id)}
                          />
                          <label
                            htmlFor={`income-${category.id}`}
                            className="flex items-center space-x-2 text-sm cursor-pointer"
                          >
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            <span>{category.name}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expense Categories */}
                {expenseCategories.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-700 mb-2">Expense Categories</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {expenseCategories.map((category) => (
                        <div key={category.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`expense-${category.id}`}
                            checked={filters.categoryIds?.includes(category.id) || false}
                            onCheckedChange={() => handleCategoryToggle(category.id)}
                          />
                          <label
                            htmlFor={`expense-${category.id}`}
                            className="flex items-center space-x-2 text-sm cursor-pointer"
                          >
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            <span>{category.name}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Export Format</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  The CSV file will include the following columns:
                </p>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• Date</li>
                  <li>• Description</li>
                  <li>• Amount</li>
                  <li>• Category</li>
                  <li>• Type (Income/Expense)</li>
                  <li>• Is Recurring</li>
                  <li>• Recurring Frequency</li>
                  <li>• Recurring End Date</li>
                  <li>• Created At</li>
                </ul>
              </CardContent>
            </Card>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleExport} disabled={exportMutation.isPending}>
                <Download className="mr-2 h-4 w-4" />
                {exportMutation.isPending ? "Exporting..." : "Export CSV"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium">Export Complete</h3>
              <p className="text-gray-600">
                {exportResult.recordCount} transactions exported to {exportResult.filename}
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
