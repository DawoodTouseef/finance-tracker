import { api, APIError } from "encore.dev/api";
import { financeDB } from "./db";

interface ImportCsvRequest {
  csvData: string;
  mapping: {
    dateColumn: number;
    descriptionColumn: number;
    amountColumn: number;
    categoryColumn?: number;
  };
  defaultCategoryId?: number;
  skipFirstRow: boolean;
}

interface ImportResult {
  totalRows: number;
  successfulImports: number;
  errors: string[];
  duplicatesSkipped: number;
}

// Imports transactions from CSV data with configurable column mapping.
export const importCsv = api<ImportCsvRequest, ImportResult>(
  { expose: true, method: "POST", path: "/transactions/import" },
  async (req) => {
    if (!req.csvData || req.csvData.trim().length === 0) {
      throw APIError.invalidArgument("CSV data is required");
    }

    if (!req.mapping.dateColumn || !req.mapping.descriptionColumn || !req.mapping.amountColumn) {
      throw APIError.invalidArgument("Date, description, and amount column mappings are required");
    }

    const lines = req.csvData.trim().split('\n');
    const startRow = req.skipFirstRow ? 1 : 0;
    const dataRows = lines.slice(startRow);

    if (dataRows.length === 0) {
      throw APIError.invalidArgument("No data rows found in CSV");
    }

    const result: ImportResult = {
      totalRows: dataRows.length,
      successfulImports: 0,
      errors: [],
      duplicatesSkipped: 0,
    };

    // Get all categories for mapping
    const categories = await financeDB.queryAll<{
      id: number;
      name: string;
      type: string;
    }>`SELECT id, name, type FROM categories`;

    const categoryMap = new Map<string, number>();
    categories.forEach(cat => {
      categoryMap.set(cat.name.toLowerCase(), cat.id);
    });

    for (let i = 0; i < dataRows.length; i++) {
      const rowIndex = i + (req.skipFirstRow ? 2 : 1); // For error reporting
      const row = dataRows[i];
      
      try {
        const columns = parseCSVRow(row);
        
        // Validate column indices
        if (columns.length <= Math.max(req.mapping.dateColumn, req.mapping.descriptionColumn, req.mapping.amountColumn)) {
          result.errors.push(`Row ${rowIndex}: Not enough columns`);
          continue;
        }

        // Parse date
        const dateStr = columns[req.mapping.dateColumn]?.trim();
        if (!dateStr) {
          result.errors.push(`Row ${rowIndex}: Date is required`);
          continue;
        }

        const date = parseDate(dateStr);
        if (!date) {
          result.errors.push(`Row ${rowIndex}: Invalid date format: ${dateStr}`);
          continue;
        }

        // Parse description
        const description = columns[req.mapping.descriptionColumn]?.trim();
        if (!description) {
          result.errors.push(`Row ${rowIndex}: Description is required`);
          continue;
        }

        // Parse amount
        const amountStr = columns[req.mapping.amountColumn]?.trim();
        if (!amountStr) {
          result.errors.push(`Row ${rowIndex}: Amount is required`);
          continue;
        }

        const amount = parseAmount(amountStr);
        if (amount === null || amount <= 0) {
          result.errors.push(`Row ${rowIndex}: Invalid amount: ${amountStr}`);
          continue;
        }

        // Determine category
        let categoryId = req.defaultCategoryId;
        if (req.mapping.categoryColumn !== undefined && columns[req.mapping.categoryColumn]) {
          const categoryName = columns[req.mapping.categoryColumn].trim().toLowerCase();
          const mappedCategoryId = categoryMap.get(categoryName);
          if (mappedCategoryId) {
            categoryId = mappedCategoryId;
          }
        }

        if (!categoryId) {
          result.errors.push(`Row ${rowIndex}: No category specified and no default category provided`);
          continue;
        }

        // Check for duplicates
        const existingTransaction = await financeDB.queryRow<{ id: number }>`
          SELECT id FROM transactions 
          WHERE description = ${description}
            AND amount = ${amount}
            AND date = ${date}
            AND category_id = ${categoryId}
        `;

        if (existingTransaction) {
          result.duplicatesSkipped++;
          continue;
        }

        // Insert transaction
        await financeDB.exec`
          INSERT INTO transactions (amount, description, category_id, date, is_recurring)
          VALUES (${amount}, ${description}, ${categoryId}, ${date}, false)
        `;

        result.successfulImports++;

      } catch (error: any) {
        result.errors.push(`Row ${rowIndex}: ${error.message || 'Unknown error'}`);
      }
    }

    return result;
  }
);

function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current);
  
  return result;
}

function parseDate(dateStr: string): Date | null {
  // Try common date formats
  const formats = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
    /^\d{1,2}\/\d{1,2}\/\d{4}$/, // M/D/YYYY
  ];

  for (const format of formats) {
    if (format.test(dateStr)) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return null;
}

function parseAmount(amountStr: string): number | null {
  // Remove currency symbols and whitespace
  const cleaned = amountStr.replace(/[$,\s]/g, '');
  
  // Handle negative amounts in parentheses
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')');
  const numberStr = isNegative ? cleaned.slice(1, -1) : cleaned;
  
  const amount = parseFloat(numberStr);
  if (isNaN(amount)) {
    return null;
  }
  
  return isNegative ? -amount : amount;
}
