import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import backend from "~backend/client";
import type { Transaction } from "~backend/finance/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Trash2, Edit, ArrowUpRight, ArrowDownRight, Search, Upload, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import ErrorBoundary from "../components/ErrorBoundary";
import TransactionForm from "../components/TransactionForm";
import UpdateTransactionForm from "../components/UpdateTransactionForm";
import AdvancedTransactionFilters from "../components/AdvancedTransactionFilters";
import QuickSearchBar from "../components/QuickSearchBar";
import FilterSummary from "../components/FilterSummary";
import CsvImportDialog from "../components/CsvImportDialog";
import CsvExportDialog from "../components/CsvExportDialog";

interface AdvancedFilters {
  categoryIds?: number[];
  startDate?: string;
  endDate?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  type?: string;
}

export default function Transactions() {
  const [showForm, setShowForm] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState<AdvancedFilters>({});
  const [quickSearch, setQuickSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 20;

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [filters, quickSearch]);

  // Combine quick search with advanced filters
  const combinedFilters = {
    ...filters,
    search: quickSearch || filters.search,
  };

  // Convert filters to API format
  const apiFilters = {
    ...combinedFilters,
    categoryIds: combinedFilters.categoryIds?.join(','),
    limit,
    offset: page * limit,
  };

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["transactions", apiFilters],
    queryFn: () => backend.finance.listTransactions(apiFilters),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => backend.finance.deleteTransaction({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast({ title: "Transaction deleted successfully" });
    },
    onError: (error: any) => {
      console.error("Delete transaction error:", error);
      const message = error?.message || "Failed to delete transaction";
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

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
  };

  const handleCloseEditForm = () => {
    setEditingTransaction(null);
  };

  const handleEditSuccess = () => {
    setEditingTransaction(null);
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["reports"] });
  };

  const handleRemoveFilter = (filterKey: string, value?: any) => {
    if (filterKey === "categoryIds" && value !== undefined) {
      // Remove specific category
      const newCategoryIds = (filters.categoryIds || []).filter(id => id !== value);
      setFilters({
        ...filters,
        categoryIds: newCategoryIds.length > 0 ? newCategoryIds : undefined,
      });
    } else if (filterKey === "minAmount" || filterKey === "maxAmount") {
      // Remove amount filters
      const newFilters = { ...filters };
      delete newFilters.minAmount;
      delete newFilters.maxAmount;
      setFilters(newFilters);
    } else if (filterKey === "startDate" || filterKey === "endDate") {
      // Remove date filters
      const newFilters = { ...filters };
      delete newFilters.startDate;
      delete newFilters.endDate;
      setFilters(newFilters);
    } else {
      // Remove single filter
      const newFilters = { ...filters };
      delete newFilters[filterKey as keyof AdvancedFilters];
      setFilters(newFilters);
    }
  };

  const handleClearAllFilters = () => {
    setFilters({});
    setQuickSearch("");
  };

  const handleImportSuccess = () => {
    setShowImportDialog(false);
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["reports"] });
  };

  const totalPages = Math.ceil((transactions?.total || 0) / limit);

  const hasActiveFilters = Object.keys(combinedFilters).some(key => {
    const value = combinedFilters[key as keyof AdvancedFilters];
    return value !== undefined && value !== "" && (Array.isArray(value) ? value.length > 0 : true);
  });

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
            <p className="text-gray-600 mt-2">Manage your income and expenses</p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowImportDialog(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowExportDialog(true)}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={hasActiveFilters ? "border-blue-500 text-blue-600" : ""}
            >
              <Filter className="mr-2 h-4 w-4" />
              Advanced Filters
            </Button>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Transaction
            </Button>
          </div>
        </div>

        {/* Quick Search Bar */}
        <div className="max-w-md">
          <QuickSearchBar
            value={quickSearch}
            onChange={setQuickSearch}
            onClear={() => setQuickSearch("")}
            placeholder="Search transactions by description..."
          />
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <ErrorBoundary>
            <AdvancedTransactionFilters
              filters={filters}
              onFiltersChange={setFilters}
              onClose={() => setShowAdvancedFilters(false)}
            />
          </ErrorBoundary>
        )}

        {/* Filter Summary */}
        <ErrorBoundary>
          <FilterSummary
            filters={combinedFilters}
            onRemoveFilter={handleRemoveFilter}
            onClearAll={handleClearAllFilters}
          />
        </ErrorBoundary>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>
                {hasActiveFilters ? "Filtered " : "All "}Transactions ({transactions?.total || 0})
              </span>
              {isLoading && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Searching...</span>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading transactions...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions?.transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: transaction.category.color }}
                      />
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <span>{transaction.category.name}</span>
                          <span>•</span>
                          <span>{formatDate(transaction.date)}</span>
                          {transaction.isRecurring && (
                            <>
                              <span>•</span>
                              <span className="text-blue-600">
                                Recurring ({transaction.recurringFrequency})
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        {transaction.category.type === "income" ? (
                          <ArrowUpRight className="h-4 w-4 text-green-600 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-600 mr-1" />
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
                      
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(transaction)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(transaction.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {!transactions?.transactions.length && (
                  <div className="text-center py-12 text-gray-500">
                    {hasActiveFilters ? (
                      <div className="space-y-2">
                        <Search className="h-12 w-12 mx-auto text-gray-300" />
                        <h3 className="text-lg font-medium">No transactions found</h3>
                        <p>Try adjusting your search criteria or filters</p>
                        <Button
                          variant="outline"
                          onClick={handleClearAllFilters}
                          className="mt-4"
                        >
                          Clear all filters
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <h3 className="text-lg font-medium">No transactions yet</h3>
                        <p>Start by adding your first transaction</p>
                        <Button onClick={() => setShowForm(true)} className="mt-4">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Transaction
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">
                    Page {page + 1} of {totalPages}
                  </span>
                  <span className="text-sm text-gray-400">
                    ({transactions?.total || 0} total)
                  </span>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages - 1}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {showForm && (
          <ErrorBoundary>
            <TransactionForm
              onClose={() => setShowForm(false)}
              onSuccess={() => {
                setShowForm(false);
                queryClient.invalidateQueries({ queryKey: ["transactions"] });
                queryClient.invalidateQueries({ queryKey: ["reports"] });
              }}
            />
          </ErrorBoundary>
        )}

        {editingTransaction && (
          <ErrorBoundary>
            <UpdateTransactionForm
              transaction={editingTransaction}
              onClose={handleCloseEditForm}
              onSuccess={handleEditSuccess}
            />
          </ErrorBoundary>
        )}

        {showImportDialog && (
          <ErrorBoundary>
            <CsvImportDialog
              onClose={() => setShowImportDialog(false)}
              onSuccess={handleImportSuccess}
            />
          </ErrorBoundary>
        )}

        {showExportDialog && (
          <ErrorBoundary>
            <CsvExportDialog
              onClose={() => setShowExportDialog(false)}
            />
          </ErrorBoundary>
        )}
      </div>
    </ErrorBoundary>
  );
}
