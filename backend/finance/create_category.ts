import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { financeDB } from "./db";
import type { Category, TransactionType } from "./types";

export interface CreateCategoryRequest {
  name: string;
  type: TransactionType;
  color: string;
}

// Creates a new expense or income category.
export const createCategory = api<CreateCategoryRequest, Category>(
  { expose: true, method: "POST", path: "/categories", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    // Input validation
    if (!req.name || req.name.trim().length === 0) {
      throw APIError.invalidArgument("name is required and cannot be empty");
    }

    if (req.name.length > 100) {
      throw APIError.invalidArgument("name cannot exceed 100 characters");
    }

    if (!req.type || !["income", "expense"].includes(req.type)) {
      throw APIError.invalidArgument("type must be either 'income' or 'expense'");
    }

    if (!req.color || req.color.trim().length === 0) {
      throw APIError.invalidArgument("color is required");
    }

    // Validate color format (hex color)
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!hexColorRegex.test(req.color)) {
      throw APIError.invalidArgument("color must be a valid hex color (e.g., #ff0000)");
    }

    try {
      const result = await financeDB.queryRow<{
        id: number;
        name: string;
        type: string;
        color: string;
        created_at: Date;
      }>`
        INSERT INTO categories (name, type, color, user_id)
        VALUES (${req.name.trim()}, ${req.type}, ${req.color}, ${userId})
        RETURNING id, name, type, color, created_at
      `;

      if (!result) {
        throw APIError.internal("failed to create category");
      }

      return {
        id: result.id,
        name: result.name,
        type: result.type as TransactionType,
        color: result.color,
        createdAt: result.created_at,
      };
    } catch (err: any) {
      if (err.code === "23505") { // unique constraint violation
        throw APIError.alreadyExists("category with this name already exists");
      }
      throw APIError.internal("failed to create category");
    }
  }
);
