import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { financeDB } from "./db";

interface DeleteTransactionParams {
  id: number;
}

// Deletes a transaction.
export const deleteTransaction = api<DeleteTransactionParams, void>(
  { expose: true, method: "DELETE", path: "/transactions/:id", auth: true },
  async (params) => {
    const auth = getAuthData()!;
    const userId = auth.userID;

    const result = await financeDB.queryRow`
      DELETE FROM transactions WHERE id = ${params.id} AND user_id = ${userId}
      RETURNING id
    `;

    if (!result) {
      throw APIError.notFound("transaction not found");
    }
  }
);
