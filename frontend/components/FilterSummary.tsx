import { useQuery } from "@tanstack/react-query";
import backend from "~backend/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Calendar, DollarSign, Tag, Type } from "lucide-react";

interface AdvancedFilters {
  categoryIds?: number[];
  startDate?: string;
  endDate?: string;
  search?: string;
  minAmount?: number;
  maxAmount?: number;
  type?: string;
}

interface FilterSummaryProps {
  filters: AdvancedFilters;
  onRemoveFilter: (filterKey: string, value?: any) => void;
  onClearAll: () => void;
}

export default function FilterSummary({ filters, onRemoveFilter, onClearAll }: FilterSummaryProps) {
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => backend.finance.listCategories(),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getActiveFilters = () => {
    const activeFilters = [];

    // Search filter
    if (filters.search) {
      activeFilters.push({
        key: "search",
        label: `Search: "${filters.search}"`,
        icon: <Type className="h-3 w-3" />,
        onRemove: () => onRemoveFilter("search"),
      });
    }

    // Type filter
    if (filters.type) {
      activeFilters.push({
        key: "type",
        label: `Type: ${filters.type}`,
        icon: <Type className="h-3 w-3" />,
        onRemove: () => onRemoveFilter("type"),
      });
    }

    // Amount range filters
    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      let label = "Amount: ";
      if (filters.minAmount !== undefined && filters.maxAmount !== undefined) {
        label += `${formatCurrency(filters.minAmount)} - ${formatCurrency(filters.maxAmount)}`;
      } else if (filters.minAmount !== undefined) {
        label += `≥ ${formatCurrency(filters.minAmount)}`;
      } else if (filters.maxAmount !== undefined) {
        label += `≤ ${formatCurrency(filters.maxAmount)}`;
      }
      
      activeFilters.push({
        key: "amount",
        label,
        icon: <DollarSign className="h-3 w-3" />,
        onRemove: () => {
          onRemoveFilter("minAmount");
          onRemoveFilter("maxAmount");
        },
      });
    }

    // Date range filters
    if (filters.startDate || filters.endDate) {
      let label = "Date: ";
      if (filters.startDate && filters.endDate) {
        label += `${formatDate(filters.startDate)} - ${formatDate(filters.endDate)}`;
      } else if (filters.startDate) {
        label += `From ${formatDate(filters.startDate)}`;
      } else if (filters.endDate) {
        label += `Until ${formatDate(filters.endDate)}`;
      }
      
      activeFilters.push({
        key: "date",
        label,
        icon: <Calendar className="h-3 w-3" />,
        onRemove: () => {
          onRemoveFilter("startDate");
          onRemoveFilter("endDate");
        },
      });
    }

    // Category filters
    if (filters.categoryIds && filters.categoryIds.length > 0 && categories) {
      const selectedCategories = categories.categories.filter(cat => 
        filters.categoryIds!.includes(cat.id)
      );
      
      selectedCategories.forEach(category => {
        activeFilters.push({
          key: `category-${category.id}`,
          label: category.name,
          icon: (
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: category.color }}
            />
          ),
          onRemove: () => onRemoveFilter("categoryIds", category.id),
        });
      });
    }

    return activeFilters;
  };

  const activeFilters = getActiveFilters();

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-gray-50 rounded-lg">
      <span className="text-sm font-medium text-gray-700">Active filters:</span>
      {activeFilters.map((filter) => (
        <Badge
          key={filter.key}
          variant="secondary"
          className="flex items-center space-x-1 pr-1"
        >
          {filter.icon}
          <span className="text-xs">{filter.label}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={filter.onRemove}
            className="h-4 w-4 p-0 hover:bg-gray-200 ml-1"
          >
            <X className="h-2 w-2" />
          </Button>
        </Badge>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="text-xs text-gray-500 hover:text-gray-700"
      >
        Clear all
      </Button>
    </div>
  );
}
