import { api, APIError } from "encore.dev/api";
import { financeDB } from "./db";

interface DeleteBillParams {
  id: number;
}

// Deletes a bill and all associated payments.
export const deleteBill = api<DeleteBillParams, void>(
  { expose: true, method: "DELETE", path: "/bills/:id" },
  async (params) => {
    const result = await financeDB.queryRow`
      DELETE FROM bills WHERE id = ${params.id}
      RETURNING id
    `;

    if (!result) {
      throw APIError.notFound("bill not found");
    }
  }
);
