import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { financeDB } from "./db";
import type { Category } from "./types";

interface ListCategoriesResponse {
  categories: Category[];
}

// Retrieves all expense and income categories for the authenticated user.
export const listCategories = api<void, ListCategoriesResponse>(
  { expose: true, method: "GET", path: "/categories", auth: true },
  async () => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    const categories = await financeDB.queryAll<{
      id: number;
      name: string;
      type: string;
      color: string;
      created_at: Date;
    }>`
      SELECT id, name, type, color, created_at
      FROM categories
      WHERE user_id = ${userId}
      ORDER BY type, name
    `;

    return {
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        type: cat.type as "income" | "expense",
        color: cat.color,
        createdAt: cat.created_at,
      })),
    };
  }
);
