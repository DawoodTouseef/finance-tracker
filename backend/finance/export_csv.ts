import { api } from "encore.dev/api";
import { Query } from "encore.dev/api";
import { financeDB } from "./db";

interface ExportCsvParams {
  startDate?: Query<string>;
  endDate?: Query<string>;
  categoryIds?: Query<string>; // comma-separated
  includeRecurring?: Query<boolean>;
}

interface ExportCsvResponse {
  csvData: string;
  filename: string;
  recordCount: number;
}

// Exports transactions to CSV format with optional filtering.
export const exportCsv = api<ExportCsvParams, ExportCsvResponse>(
  { expose: true, method: "GET", path: "/transactions/export" },
  async (params) => {
    let whereClause = "WHERE 1=1";
    const queryParams: any[] = [];
    let paramIndex = 1;

    // Date range filters
    if (params.startDate) {
      whereClause += ` AND t.date >= $${paramIndex}`;
      queryParams.push(params.startDate);
      paramIndex++;
    }

    if (params.endDate) {
      whereClause += ` AND t.date <= $${paramIndex}`;
      queryParams.push(params.endDate);
      paramIndex++;
    }

    // Category filter
    if (params.categoryIds) {
      const categoryIds = params.categoryIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (categoryIds.length > 0) {
        const placeholders = categoryIds.map(() => `$${paramIndex++}`).join(',');
        whereClause += ` AND t.category_id IN (${placeholders})`;
        queryParams.push(...categoryIds);
      }
    }

    // Recurring filter
    if (params.includeRecurring === false) {
      whereClause += ` AND t.is_recurring = false`;
    }

    const query = `
      SELECT 
        t.date,
        t.description,
        t.amount,
        c.name as category_name,
        c.type as category_type,
        t.is_recurring,
        t.recurring_frequency,
        t.recurring_end_date,
        t.created_at
      FROM transactions t
      JOIN categories c ON t.category_id = c.id
      ${whereClause}
      ORDER BY t.date DESC, t.created_at DESC
    `;

    const transactions = await financeDB.rawQueryAll<{
      date: Date;
      description: string;
      amount: number;
      category_name: string;
      category_type: string;
      is_recurring: boolean;
      recurring_frequency: string | null;
      recurring_end_date: Date | null;
      created_at: Date;
    }>(query, ...queryParams);

    // Generate CSV content
    const headers = [
      'Date',
      'Description',
      'Amount',
      'Category',
      'Type',
      'Is Recurring',
      'Recurring Frequency',
      'Recurring End Date',
      'Created At'
    ];

    const csvRows = [headers.join(',')];

    transactions.forEach(transaction => {
      const row = [
        formatDate(transaction.date),
        escapeCSVField(transaction.description),
        transaction.amount.toString(),
        escapeCSVField(transaction.category_name),
        transaction.category_type,
        transaction.is_recurring.toString(),
        transaction.recurring_frequency || '',
        transaction.recurring_end_date ? formatDate(transaction.recurring_end_date) : '',
        formatDateTime(transaction.created_at)
      ];
      csvRows.push(row.join(','));
    });

    const csvData = csvRows.join('\n');
    
    // Generate filename with current date
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const filename = `transactions_export_${dateStr}.csv`;

    return {
      csvData,
      filename,
      recordCount: transactions.length,
    };
  }
);

function formatDate(date: Date): string {
  return new Date(date).toISOString().split('T')[0];
}

function formatDateTime(date: Date): string {
  return new Date(date).toISOString();
}

function escapeCSVField(field: string): string {
  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}
