import { api, APIError } from "encore.dev/api";
import { financeDB } from "./db";

interface DeleteBudgetParams {
  id: number;
}

// Deletes a budget.
export const deleteBudget = api<DeleteBudgetParams, void>(
  { expose: true, method: "DELETE", path: "/budgets/:id" },
  async (params) => {
    const result = await financeDB.queryRow`
      DELETE FROM budgets WHERE id = ${params.id}
      RETURNING id
    `;

    if (!result) {
      throw APIError.notFound("budget not found");
    }
  }
);
