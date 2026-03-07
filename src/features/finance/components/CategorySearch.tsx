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
      <label className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-3 block">Category</label>

      {/* Search Input */}
      <div className="relative group">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors"
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
          className="w-full bg-zinc-900/50 border border-white/10 p-4 pl-12 rounded-2xl text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-zinc-600 shadow-inner"
        />
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 glass-panel rounded-2xl border border-white/10 shadow-2xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
          {filteredCategories.length === 0 ? (
            <div className="p-4 text-center text-zinc-500 text-sm font-medium">
              No categories found
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategorySelect(category.id)}
                  className={`w-full px-4 py-3 flex items-center gap-3 rounded-xl transition-all text-left ${selectedId === category.id
                      ? "bg-indigo-500/10 border border-indigo-500/20"
                      : "bg-transparent hover:bg-zinc-800/80 border border-transparent"
                    }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-inner ${getCategoryColor(
                      category.name
                    )}`}
                  >
                    <Tag size={16} className={selectedId === category.id ? "text-indigo-400" : "text-white/80"} />
                  </div>
                  <span className={`font-semibold tracking-wide ${selectedId === category.id ? "text-indigo-100" : "text-zinc-200"}`}>{category.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected Category Display */}
      {selectedCategory && !searchQuery && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
          <div
            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-white/5 shadow-sm ${getCategoryColor(
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
