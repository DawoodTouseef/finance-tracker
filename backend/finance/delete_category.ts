import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { financeDB } from "./db";

interface DeleteCategoryParams {
  id: number;
}

// Deletes a category.
export const deleteCategory = api<DeleteCategoryParams, void>(
  { expose: true, method: "DELETE", path: "/categories/:id", auth: true },
  async (params) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    // Check if category has associated transactions
    const transactionCount = await financeDB.queryRow<{ count: number }>`
      SELECT COUNT(*) as count FROM transactions WHERE category_id = ${params.id} AND user_id = ${userId}
    `;

    if (transactionCount && transactionCount.count > 0) {
      throw APIError.failedPrecondition(
        "cannot delete category with existing transactions"
      );
    }

    // Check if category has associated budgets
    const budgetCount = await financeDB.queryRow<{ count: number }>`
      SELECT COUNT(*) as count FROM budgets WHERE category_id = ${params.id} AND user_id = ${userId}
    `;

    if (budgetCount && budgetCount.count > 0) {
      throw APIError.failedPrecondition(
        "cannot delete category with existing budgets"
      );
    }

    const result = await financeDB.queryRow`
      DELETE FROM categories WHERE id = ${params.id} AND user_id = ${userId}
      RETURNING id
    `;

    if (!result) {
      throw APIError.notFound("category not found");
    }
  }
);
