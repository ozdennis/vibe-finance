// src/features/finance/components/CategorySearch.tsx
"use client";

import { useState, useMemo } from "react";
import Fuse from "fuse.js";
import { Search, Tag } from "lucide-react";
import { getCategoryColor } from "../lib/utils";

interface Category {
  id: string;
  name: string;
}

interface CategorySearchProps {
  categories: Category[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function CategorySearch({
  categories,
  selectedId,
  onSelect,
}: CategorySearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Initialize Fuse.js for fuzzy search
  const fuse = useMemo(
    () =>
      new Fuse(categories, {
        keys: ["name"],
        threshold: 0.4, // Allows for typos
        includeScore: true,
      }),
    [categories]
  );

  // Filter categories based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return categories;
    }

    const results = fuse.search(searchQuery);
    return results.map((result) => result.item);
  }, [searchQuery, fuse, categories]);

  const selectedCategory = categories.find((c) => c.id === selectedId);

  const handleCategorySelect = (id: string) => {
    onSelect(id);
    setSearchQuery("");
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <label className="text-slate-400 text-xs mb-2 block">Category</label>

      {/* Search Input */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={selectedCategory?.name || "Search category..."}
          className="w-full bg-slate-800 p-4 pl-10 rounded-xl text-white outline-none focus:ring-2 focus:ring-emerald-500/50"
        />
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-slate-800 rounded-xl border border-slate-700 shadow-2xl max-h-60 overflow-y-auto">
          {filteredCategories.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              No categories found
            </div>
          ) : (
            filteredCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => handleCategorySelect(category.id)}
                className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-700 transition-colors text-left ${
                  selectedId === category.id ? "bg-slate-700" : ""
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${getCategoryColor(
                    category.name
                  )}`}
                >
                  <Tag size={16} />
                </div>
                <span className="text-white font-medium">{category.name}</span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Selected Category Display */}
      {selectedCategory && !searchQuery && (
        <div className="mt-2 flex items-center gap-2">
          <div
            className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(
              selectedCategory.name
            )}`}
          >
            {selectedCategory.name}
          </div>
        </div>
      )}
    </div>
  );
}
