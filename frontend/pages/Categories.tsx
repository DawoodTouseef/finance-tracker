import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import backend from "~backend/client";
import type { Category } from "~backend/finance/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import CategoryForm from "../components/CategoryForm";

export default function Categories() {
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => backend.finance.listCategories(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => backend.finance.deleteCategory({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: "Category deleted successfully" });
    },
    onError: (error: any) => {
      console.error("Delete category error:", error);
      let message = "Failed to delete category";
      if (error?.message?.includes("existing transactions")) {
        message = "Cannot delete category with existing transactions";
      } else if (error?.message?.includes("existing budgets")) {
        message = "Cannot delete category with existing budgets";
      }
      toast({ 
        title: "Error", 
        description: message,
        variant: "destructive" 
      });
    },
  });

  const handleDelete = (category: Category) => {
    if (confirm(`Are you sure you want to delete the "${category.name}" category?`)) {
      deleteMutation.mutate(category.id);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCategory(null);
  };

  const handleFormSuccess = () => {
    handleCloseForm();
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const incomeCategories = categories?.categories.filter(cat => cat.type === "income") || [];
  const expenseCategories = categories?.categories.filter(cat => cat.type === "expense") || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-600 mt-2">Manage your income and expense categories</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income Categories */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span>Income Categories</span>
              </CardTitle>
              <Badge variant="secondary">{incomeCategories.length}</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {incomeCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(category)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {incomeCategories.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No income categories</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Expense Categories */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <span>Expense Categories</span>
              </CardTitle>
              <Badge variant="secondary">{expenseCategories.length}</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expenseCategories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(category)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {expenseCategories.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No expense categories</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showForm && (
        <CategoryForm
          category={editingCategory || undefined}
          onClose={handleCloseForm}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
