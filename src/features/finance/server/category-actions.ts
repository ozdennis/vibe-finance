// src/features/finance/server/category-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

/**
 * Create a new category
 */
export async function createCategory(data: {
  name: string;
  color?: string;
  icon?: string;
  userId: string;
}) {
  try {
    const normalizedName = data.name.toUpperCase().trim();

    // Check if category already exists
    const existing = await db.category.findFirst({
      where: {
        name: normalizedName,
        createdById: data.userId,
      },
    });

    if (existing) {
      return {
        success: false,
        error: `Category "${normalizedName}" already exists`,
      };
    }

    const category = await db.category.create({
      data: {
        name: normalizedName,
        color: data.color,
        icon: data.icon,
        createdById: data.userId,
      },
    });

    revalidatePath("/");
    return { success: true, data: category };
  } catch (error) {
    console.error("createCategory error:", error);
    if (error instanceof Error) {
      // Check for Prisma unique constraint error
      if (error.message.includes("Unique constraint")) {
        return {
          success: false,
          error: `Category "${data.name.toUpperCase().trim()}" already exists`,
        };
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to create category" };
  }
}

/**
 * Update a category
 */
export async function updateCategory(data: {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  userId: string;
}) {
  try {
    // Verify ownership
    const existing = await db.category.findFirst({
      where: { id: data.id, createdById: data.userId },
    });

    if (!existing) {
      throw new Error("Category not found");
    }

    const category = await db.category.update({
      where: { id: data.id },
      data: {
        name: data.name.toUpperCase(),
        color: data.color,
        icon: data.icon,
      },
    });

    revalidatePath("/");
    return { success: true, data: category };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to update category" };
  }
}

/**
 * Delete a category
 */
export async function deleteCategory(categoryId: string, userId: string) {
  try {
    // Verify ownership
    const existing = await db.category.findFirst({
      where: { id: categoryId, createdById: userId },
    });

    if (!existing) {
      throw new Error("Category not found");
    }

    // Check for transactions using this category
    const transactionCount = await db.transaction.count({
      where: { categoryId },
    });

    if (transactionCount > 0) {
      throw new Error(
        "Cannot delete category with transactions. Use 'Other' instead."
      );
    }

    await db.category.delete({
      where: { id: categoryId },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to delete category" };
  }
}

/**
 * Delete multiple categories
 */
export async function deleteManyCategories(categoryIds: string[], userId: string) {
  try {
    if (!categoryIds.length) {
      throw new Error("No categories selected");
    }

    // Verify all categories exist and belong to user
    const categories = await db.category.findMany({
      where: {
        id: { in: categoryIds },
        createdById: userId,
      },
    });

    if (categories.length === 0) {
      throw new Error("No categories found");
    }

    const results = {
      success: true,
      deleted: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Check for transactions on each category
    for (const category of categories) {
      const transactionCount = await db.transaction.count({
        where: { categoryId: category.id },
      });

      if (transactionCount > 0) {
        results.failed++;
        results.errors.push(
          `Cannot delete "${category.name}" - it has ${transactionCount} transaction(s)`
        );
        continue;
      }

      // Delete the category
      await db.category.delete({
        where: { id: category.id },
      });

      results.deleted++;
    }

    revalidatePath("/");
    return {
      ...results,
      success: results.failed === 0,
    };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Failed to delete categories" };
  }
}
