import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import backend from "~backend/client";
import type { CreateCategoryRequest } from "~backend/finance/create_category";
import type { UpdateCategoryRequest } from "~backend/finance/update_category";
import type { Category } from "~backend/finance/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

interface CategoryFormProps {
  category?: Category;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormErrors {
  name?: string;
  type?: string;
  color?: string;
}

const colorOptions = [
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Yellow" },
  { value: "#84cc16", label: "Lime" },
  { value: "#10b981", label: "Green" },
  { value: "#059669", label: "Emerald" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#ec4899", label: "Pink" },
  { value: "#6b7280", label: "Gray" },
  { value: "#1f2937", label: "Dark Gray" },
];

export default function CategoryForm({ category, onClose, onSuccess }: CategoryFormProps) {
  const [formData, setFormData] = useState<CreateCategoryRequest>({
    name: "",
    type: "expense",
    color: "#ef4444",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const { toast } = useToast();
  const isEditing = !!category;

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        type: category.type,
        color: category.color,
      });
    }
  }, [category]);

  const createMutation = useMutation({
    mutationFn: (data: CreateCategoryRequest) => backend.finance.createCategory(data),
    onSuccess: () => {
      toast({ title: "Category created successfully" });
      onSuccess();
    },
    onError: (error: any) => {
      console.error("Create category error:", error);
      const message = error?.message?.includes("already exists") 
        ? "A category with this name already exists"
        : error?.message || "Failed to create category";
      toast({ 
        title: "Error", 
        description: message,
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateCategoryRequest) => 
      backend.finance.updateCategory({ id: category!.id, ...data }),
    onSuccess: () => {
      toast({ title: "Category updated successfully" });
      onSuccess();
    },
    onError: (error: any) => {
      console.error("Update category error:", error);
      const message = error?.message?.includes("already exists") 
        ? "A category with this name already exists"
        : error?.message || "Failed to update category";
      toast({ 
        title: "Error", 
        description: message,
        variant: "destructive" 
      });
    },
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.length > 100) {
      newErrors.name = "Name cannot exceed 100 characters";
    }

    if (!formData.type || !["income", "expense"].includes(formData.type)) {
      newErrors.type = "Please select a valid type";
    }

    if (!formData.color.trim()) {
      newErrors.color = "Color is required";
    } else {
      const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!hexColorRegex.test(formData.color)) {
        newErrors.color = "Please select a valid color";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      if (isEditing) {
        updateMutation.mutate(formData);
      } else {
        createMutation.mutate(formData);
      }
    }
  };

  const handleNameChange = (value: string) => {
    setFormData({ ...formData, name: value });
    if (errors.name) {
      setErrors({ ...errors, name: undefined });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Category" : "Create Category"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Category Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Groceries, Rent, Salary"
              className={errors.name ? "border-red-500" : ""}
              maxLength={100}
              required
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <Label htmlFor="type">Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => {
                setFormData({ ...formData, type: value as "income" | "expense" });
                if (errors.type) {
                  setErrors({ ...errors, type: undefined });
                }
              }}
            >
              <SelectTrigger className={errors.type ? "border-red-500" : ""}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-600 mt-1">{errors.type}</p>
            )}
          </div>

          <div>
            <Label htmlFor="color">Color</Label>
            <Select
              value={formData.color}
              onValueChange={(value) => {
                setFormData({ ...formData, color: value });
                if (errors.color) {
                  setErrors({ ...errors, color: undefined });
                }
              }}
            >
              <SelectTrigger className={errors.color ? "border-red-500" : ""}>
                <SelectValue>
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: formData.color }}
                    />
                    <span>
                      {colorOptions.find(c => c.value === formData.color)?.label || "Custom"}
                    </span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center space-x-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: color.value }}
                      />
                      <span>{color.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.color && (
              <p className="text-sm text-red-600 mt-1">{errors.color}</p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading 
                ? (isEditing ? "Updating..." : "Creating...") 
                : (isEditing ? "Update Category" : "Create Category")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
