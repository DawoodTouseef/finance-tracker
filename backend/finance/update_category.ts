import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { financeDB } from "./db";
import type { Category, TransactionType } from "./types";

interface UpdateCategoryParams {
  id: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  type?: TransactionType;
  color?: string;
}

// Updates an existing category.
export const updateCategory = api<UpdateCategoryParams & UpdateCategoryRequest, Category>(
  { expose: true, method: "PUT", path: "/categories/:id", auth: true },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    if (!req.id || req.id <= 0) {
      throw APIError.invalidArgument("valid category id is required");
    }

    // Input validation for provided fields
    if (req.name !== undefined) {
      if (!req.name || req.name.trim().length === 0) {
        throw APIError.invalidArgument("name cannot be empty");
      }
      if (req.name.length > 100) {
        throw APIError.invalidArgument("name cannot exceed 100 characters");
      }
    }

    if (req.type !== undefined && !["income", "expense"].includes(req.type)) {
      throw APIError.invalidArgument("type must be either 'income' or 'expense'");
    }

    if (req.color !== undefined) {
      if (!req.color || req.color.trim().length === 0) {
        throw APIError.invalidArgument("color cannot be empty");
      }
      const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!hexColorRegex.test(req.color)) {
        throw APIError.invalidArgument("color must be a valid hex color (e.g., #ff0000)");
      }
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (req.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(req.name.trim());
      paramIndex++;
    }

    if (req.type !== undefined) {
      updates.push(`type = $${paramIndex}`);
      values.push(req.type);
      paramIndex++;
    }

    if (req.color !== undefined) {
      updates.push(`color = $${paramIndex}`);
      values.push(req.color);
      paramIndex++;
    }

    if (updates.length === 0) {
      throw APIError.invalidArgument("no fields to update");
    }

    const query = `
      UPDATE categories 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
      RETURNING id, name, type, color, created_at
    `;

    values.push(req.id, userId);

    try {
      const result = await financeDB.rawQueryRow<{
        id: number;
        name: string;
        type: string;
        color: string;
        created_at: Date;
      }>(query, ...values);

      if (!result) {
        throw APIError.notFound("category not found");
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
      throw APIError.internal("failed to update category");
    }
  }
);
