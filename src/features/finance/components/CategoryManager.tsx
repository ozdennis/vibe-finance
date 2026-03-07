// src/features/finance/components/CategoryManager.tsx
"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, X, Tag } from "lucide-react";
import { createCategory, updateCategory, deleteCategory } from "../server/category-actions";
import { getCategoryColor } from "../lib/utils";

interface Category {
  id: string;
  name: string;
  color?: string | null;
  icon?: string | null;
}

interface CategoryManagerProps {
  categories: Category[];
  userId: string;
}

export function CategoryManager({ categories, userId }: CategoryManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    color: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      name: formData.name,
      color: formData.color || undefined,
      userId,
    };

    let result;
    if (editingCategory) {
      result = await updateCategory({ ...data, id: editingCategory.id });
    } else {
      result = await createCategory(data);
    }

    if (result?.success) {
      resetForm();
      setIsOpen(false);
    } else {
      alert(result?.error || "Failed to save category");
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      color: category.color || "",
    });
    setIsOpen(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm("Are you sure? Cannot delete if category has transactions.")) return;

    const result = await deleteCategory(categoryId, userId);
    if (!result?.success) {
      alert(result?.error || "Failed to delete category");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", color: "" });
    setEditingCategory(null);
  };

  return (
    <>
      <button
        onClick={() => {
          resetForm();
          setIsOpen(true);
        }}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-400 bg-emerald-400/10 hover:bg-emerald-400/20 rounded-xl transition-colors"
      >
        <Plus size={16} />
        Add Category
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-800">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-xl font-bold text-white">
                {editingCategory ? "Edit Category" : "New Category"}
              </h3>
              <button
                onClick={() => {
                  setIsOpen(false);
                  resetForm();
                }}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-slate-400 text-xs mb-2 block">
                  Category Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., FOOD, TRANSPORT"
                  className="w-full bg-slate-800 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50 uppercase"
                  required
                />
              </div>

              <div>
                <label className="text-slate-400 text-xs mb-2 block">
                  Preview
                </label>
                <div
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                    getCategoryColor(formData.name || "OTHER")
                  }`}
                >
                  <Tag size={16} />
                  <span className="font-medium">{formData.name || "CATEGORY"}</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 py-3 rounded-xl font-semibold text-slate-900 transition-colors"
              >
                {editingCategory ? "Update Category" : "Create Category"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
