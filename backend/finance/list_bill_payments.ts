import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { financeDB } from "./db";
import type { BillPayment } from "./types";

interface ListBillPaymentsParams {
  billId?: Query<number>;
  startDate?: Query<string>;
  endDate?: Query<string>;
  limit?: Query<number>;
  offset?: Query<number>;
}

interface ListBillPaymentsResponse {
  payments: (BillPayment & { billName: string })[];
  total: number;
}

// Retrieves bill payment history with optional filtering.
export const listBillPayments = api<ListBillPaymentsParams, ListBillPaymentsResponse>(
  { expose: true, method: "GET", path: "/bills/payments" },
  async (params) => {
    const limit = params.limit || 50;
    const offset = params.offset || 0;
    
    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Bill filter
    if (params.billId) {
      whereClause += ` AND bp.bill_id = $${paramIndex}`;
      queryParams.push(params.billId);
      paramIndex++;
    }

    // Date range filters
    if (params.startDate) {
      whereClause += ` AND bp.paid_date >= $${paramIndex}`;
      queryParams.push(params.startDate);
      paramIndex++;
    }

    if (params.endDate) {
      whereClause += ` AND bp.paid_date <= $${paramIndex}`;
      queryParams.push(params.endDate);
      paramIndex++;
    }

    const query = `
      SELECT 
        bp.id, bp.bill_id, bp.transaction_id, bp.amount, bp.paid_date,
        bp.is_auto_detected, bp.notes, bp.created_at,
        b.name as bill_name
      FROM bill_payments bp
      JOIN bills b ON bp.bill_id = b.id
      ${whereClause}
      ORDER BY bp.paid_date DESC, bp.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM bill_payments bp
      JOIN bills b ON bp.bill_id = b.id
      ${whereClause}
    `;

    queryParams.push(limit, offset);

    const [payments, countResult] = await Promise.all([
      financeDB.rawQueryAll<{
        id: number;
        bill_id: number;
        transaction_id: number | null;
        amount: number;
        paid_date: Date;
        is_auto_detected: boolean;
        notes: string | null;
        created_at: Date;
        bill_name: string;
      }>(query, ...queryParams.slice(0, -2), limit, offset),
      financeDB.rawQueryRow<{ total: number }>(countQuery, ...queryParams.slice(0, -2))
    ]);

    return {
      payments: payments.map(p => ({
        id: p.id,
        billId: p.bill_id,
        transactionId: p.transaction_id || undefined,
        amount: p.amount,
        paidDate: p.paid_date,
        isAutoDetected: p.is_auto_detected,
        notes: p.notes || undefined,
        createdAt: p.created_at,
        billName: p.bill_name,
      })),
      total: countResult?.total || 0,
    };
  }
);
