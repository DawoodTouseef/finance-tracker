import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import backend from "~backend/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, Search, Filter, ChevronDown, ChevronUp } from "lucide-react";

interface AdvancedFilters {
  categoryIds?: number[];
  startDate?: string;
  endDate?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  type?: string;
}

interface AdvancedTransactionFiltersProps {
  filters: AdvancedFilters;
  onFiltersChange: (filters: AdvancedFilters) => void;
  onClose: () => void;
}

export default function AdvancedTransactionFilters({ 
  filters, 
  onFiltersChange, 
  onClose 
}: AdvancedTransactionFiltersProps) {
  const [localFilters, setLocalFilters] = useState<AdvancedFilters>(filters);
  const [isExpanded, setIsExpanded] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => backend.finance.listCategories(),
  });

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {};
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const handleCategoryToggle = (categoryId: number) => {
    const currentCategories = localFilters.categoryIds || [];
    const newCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter(id => id !== categoryId)
      : [...currentCategories, categoryId];
    
    setLocalFilters({
      ...localFilters,
      categoryIds: newCategories.length > 0 ? newCategories : undefined
    });
  };

  const removeCategoryFilter = (categoryId: number) => {
    const newCategories = (localFilters.categoryIds || []).filter(id => id !== categoryId);
    setLocalFilters({
      ...localFilters,
      categoryIds: newCategories.length > 0 ? newCategories : undefined
    });
  };

  const getSelectedCategories = () => {
    if (!localFilters.categoryIds || !categories) return [];
    return categories.categories.filter(cat => localFilters.categoryIds!.includes(cat.id));
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (localFilters.categoryIds?.length) count++;
    if (localFilters.startDate) count++;
    if (localFilters.endDate) count++;
    if (localFilters.search) count++;
    if (localFilters.minAmount !== undefined) count++;
    if (localFilters.maxAmount !== undefined) count++;
    if (localFilters.type) count++;
    return count;
  };

  const incomeCategories = categories?.categories.filter(cat => cat.type === "income") || [];
  const expenseCategories = categories?.categories.filter(cat => cat.type === "expense") || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center space-x-2">
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <span>Advanced Filters</span>
          </CardTitle>
          {getActiveFiltersCount() > 0 && (
            <Badge variant="secondary">{getActiveFiltersCount()} active</Badge>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Search */}
        <div>
          <Label htmlFor="search">Search Description</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="search"
              placeholder="Search transactions..."
              value={localFilters.search || ""}
              onChange={(e) => 
                setLocalFilters({ ...localFilters, search: e.target.value || undefined })
              }
              className="pl-10"
            />
          </div>
        </div>

        {/* Selected Categories Display */}
        {localFilters.categoryIds && localFilters.categoryIds.length > 0 && (
          <div>
            <Label>Selected Categories</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {getSelectedCategories().map((category) => (
                <Badge
                  key={category.id}
                  variant="secondary"
                  className="flex items-center space-x-1"
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span>{category.name}</span>
                  <button
                    onClick={() => removeCategoryFilter(category.id)}
                    className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Expandable Advanced Filters */}
        {isExpanded && (
          <div className="space-y-6">
            {/* Transaction Type */}
            <div>
              <Label htmlFor="type-filter">Transaction Type</Label>
              <Select
                value={localFilters.type || "all"}
                onValueChange={(value) => 
                  setLocalFilters({
                    ...localFilters,
                    type: value === "all" ? undefined : value
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="income">Income only</SelectItem>
                  <SelectItem value="expense">Expenses only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min-amount">Min Amount</Label>
                <Input
                  id="min-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={localFilters.minAmount || ""}
                  onChange={(e) => 
                    setLocalFilters({
                      ...localFilters,
                      minAmount: e.target.value ? parseFloat(e.target.value) : undefined
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="max-amount">Max Amount</Label>
                <Input
                  id="max-amount"
                  type="number"
                  step="0.01"
                  placeholder="No limit"
                  value={localFilters.maxAmount || ""}
                  onChange={(e) => 
                    setLocalFilters({
                      ...localFilters,
                      maxAmount: e.target.value ? parseFloat(e.target.value) : undefined
                    })
                  }
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={localFilters.startDate || ""}
                  onChange={(e) => 
                    setLocalFilters({ 
                      ...localFilters, 
                      startDate: e.target.value || undefined 
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={localFilters.endDate || ""}
                  onChange={(e) => 
                    setLocalFilters({ 
                      ...localFilters, 
                      endDate: e.target.value || undefined 
                    })
                  }
                />
              </div>
            </div>

            {/* Category Selection */}
            <div className="space-y-4">
              <Label>Categories</Label>
              
              {/* Income Categories */}
              {incomeCategories.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-green-700 mb-2">Income Categories</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {incomeCategories.map((category) => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`income-${category.id}`}
                          checked={localFilters.categoryIds?.includes(category.id) || false}
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
                          checked={localFilters.categoryIds?.includes(category.id) || false}
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
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleClearFilters}>
            Clear All
          </Button>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApplyFilters}>
              Apply Filters
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
