import { api, APIError } from "encore.dev/api";
import { financeDB } from "./db";

interface DeleteGoalParams {
  id: number;
}

// Deletes a financial goal.
export const deleteGoal = api<DeleteGoalParams, void>(
  { expose: true, method: "DELETE", path: "/goals/:id" },
  async (params) => {
    const result = await financeDB.queryRow`
      DELETE FROM financial_goals WHERE id = ${params.id}
      RETURNING id
    `;

    if (!result) {
      throw APIError.notFound("goal not found");
    }
  }
);
