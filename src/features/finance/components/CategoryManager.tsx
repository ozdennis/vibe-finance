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
        className="flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-xl transition-all active:scale-95 border border-indigo-500/20"
      >
        <Plus size={16} />
        Add Category
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md">
          <div className="glass-panel w-full max-w-sm rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-zinc-900/40">
              <h3 className="text-xl font-bold text-zinc-100 tracking-tight">
                {editingCategory ? "Edit Category" : "New Category"}
              </h3>
              <button
                onClick={() => {
                  setIsOpen(false);
                  resetForm();
                }}
                className="p-2 hover:bg-zinc-800 rounded-full transition-all active:scale-95 text-zinc-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-3 block">
                  Category Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value.toUpperCase() })
                  }
                  placeholder="E.G. FOOD, TRANSPORT"
                  className="w-full bg-zinc-900/50 border border-white/10 p-4 rounded-2xl text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono font-bold tracking-widest placeholder:text-zinc-600"
                  required
                />
              </div>

              <div>
                <label className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-3 block">
                  Preview
                </label>
                <div className="bg-zinc-950/50 border border-white/5 p-4 rounded-2xl flex justify-center">
                  <div
                    className={`inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/5 shadow-inner transition-colors duration-300 ${getCategoryColor(formData.name || "OTHER")
                      }`}
                  >
                    <Tag size={18} />
                    <span className="font-bold tracking-widest uppercase text-xs">{formData.name || "CATEGORY"}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-indigo-500 hover:bg-indigo-400 py-4 rounded-2xl font-bold tracking-wide text-white active:scale-95 transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]"
                >
                  {editingCategory ? "Update Category" : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
