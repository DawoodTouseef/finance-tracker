import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { financeDB } from "./db";
import { Bucket } from "encore.dev/storage/objects";
import { secret } from "encore.dev/config";
import * as crypto from "crypto";

const backupBucket = new Bucket("finance-backups", {
  public: false,
  versioned: true,
});

const encryptionKey = secret("BackupEncryptionKey");

interface CreateBackupResponse {
  backupId: string;
  fileName: string;
  size: number;
  createdAt: Date;
  downloadUrl: string;
}

interface BackupMetadata {
  id: string;
  userId: string;
  fileName: string;
  size: number;
  createdAt: Date;
  description?: string;
}

interface ListBackupsResponse {
  backups: BackupMetadata[];
}

interface RestoreBackupRequest {
  backupId: string;
  replaceExisting: boolean;
}

interface RestoreBackupResponse {
  restoredItems: {
    categories: number;
    transactions: number;
    budgets: number;
    goals: number;
    bills: number;
    billPayments: number;
  };
}

// Creates a complete backup of user's financial data.
export const createBackup = api<void, CreateBackupResponse>(
  { auth: true, expose: true, method: "POST", path: "/backup/create" },
  async () => {
    const auth = getAuthData()!;
    const userId = auth.userID;
    
    try {
      // Collect all user data
      const [categories, transactions, budgets, goals, bills, billPayments] = await Promise.all([
        getUserCategories(userId),
        getUserTransactions(userId),
        getUserBudgets(userId),
        getUserGoals(userId),
        getUserBills(userId),
        getUserBillPayments(userId),
      ]);

      const backupData = {
        version: "1.0",
        userId,
        createdAt: new Date().toISOString(),
        data: {
          categories,
          transactions,
          budgets,
          goals,
          bills,
          billPayments,
        },
      };

      // Encrypt the backup data
      const encryptedData = encryptData(JSON.stringify(backupData));
      
      // Generate backup ID and filename
      const backupId = crypto.randomUUID();
      const fileName = `backup_${userId}_${new Date().toISOString().replace(/[:.]/g, '-')}.enc`;
      
      // Upload to object storage
      await backupBucket.upload(fileName, encryptedData);
      
      // Generate signed download URL (valid for 1 hour)
      const { url: downloadUrl } = await backupBucket.signedDownloadUrl(fileName, {
        ttl: 3600, // 1 hour
      });

      return {
        backupId,
        fileName,
        size: encryptedData.length,
        createdAt: new Date(),
        downloadUrl,
      };
    } catch (err: any) {
      throw APIError.internal("failed to create backup", err);
    }
  }
);

// Lists all backups for the authenticated user.
export const listBackups = api<void, ListBackupsResponse>(
  { auth: true, expose: true, method: "GET", path: "/backup/list" },
  async () => {
    const auth = getAuthData()!;
    const userId = auth.userID;
    
    try {
      const backups: BackupMetadata[] = [];
      
      // List objects with user prefix
      const prefix = `backup_${userId}_`;
      for await (const entry of backupBucket.list({ prefix })) {
        // Extract metadata from filename
        const fileName = entry.name;
        const timestampMatch = fileName.match(/backup_[^_]+_(.+)\.enc$/);
        
        if (timestampMatch) {
          const timestamp = timestampMatch[1].replace(/-/g, ':').replace(/T(\d{2})-(\d{2})-(\d{2})/, 'T$1:$2:$3');
          const createdAt = new Date(timestamp);
          
          backups.push({
            id: fileName,
            userId,
            fileName,
            size: entry.size,
            createdAt,
          });
        }
      }
      
      // Sort by creation date (newest first)
      backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      return { backups };
    } catch (err: any) {
      throw APIError.internal("failed to list backups", err);
    }
  }
);

// Downloads a backup file.
export const downloadBackup = api<{ backupId: string }, { downloadUrl: string }>(
  { auth: true, expose: true, method: "GET", path: "/backup/download/:backupId" },
  async (params) => {
    const auth = getAuthData()!;
    const userId = auth.userID;
    
    // Verify the backup belongs to the user
    if (!params.backupId.includes(`backup_${userId}_`)) {
      throw APIError.permissionDenied("access denied to this backup");
    }
    
    try {
      // Check if backup exists
      const exists = await backupBucket.exists(params.backupId);
      if (!exists) {
        throw APIError.notFound("backup not found");
      }
      
      // Generate signed download URL (valid for 1 hour)
      const { url: downloadUrl } = await backupBucket.signedDownloadUrl(params.backupId, {
        ttl: 3600, // 1 hour
      });
      
      return { downloadUrl };
    } catch (err: any) {
      if (err.message?.includes("not found")) {
        throw APIError.notFound("backup not found");
      }
      throw APIError.internal("failed to generate download link", err);
    }
  }
);

// Restores data from a backup file.
export const restoreBackup = api<RestoreBackupRequest, RestoreBackupResponse>(
  { auth: true, expose: true, method: "POST", path: "/backup/restore" },
  async (req) => {
    const auth = getAuthData()!;
    const userId = auth.userID;
    
    // Verify the backup belongs to the user
    if (!req.backupId.includes(`backup_${userId}_`)) {
      throw APIError.permissionDenied("access denied to this backup");
    }
    
    try {
      // Download and decrypt backup data
      const encryptedData = await backupBucket.download(req.backupId);
      const backupJson = decryptData(encryptedData);
      const backupData = JSON.parse(backupJson);
      
      // Validate backup format
      if (!backupData.version || !backupData.data || backupData.userId !== userId) {
        throw APIError.invalidArgument("invalid backup format or user mismatch");
      }
      
      const restoredItems = {
        categories: 0,
        transactions: 0,
        budgets: 0,
        goals: 0,
        bills: 0,
        billPayments: 0,
      };
      
      // Start transaction
      await financeDB.exec`BEGIN`;
      
      try {
        // Clear existing data if replaceExisting is true
        if (req.replaceExisting) {
          await clearUserData(userId);
        }
        
        // Restore categories
        if (backupData.data.categories?.length > 0) {
          for (const category of backupData.data.categories) {
            await financeDB.exec`
              INSERT INTO categories (name, type, color, user_id, created_at)
              VALUES (${category.name}, ${category.type}, ${category.color}, ${userId}, ${new Date(category.created_at)})
              ON CONFLICT (name, user_id) DO NOTHING
            `;
            restoredItems.categories++;
          }
        }
        
        // Get category ID mappings for foreign key references
        const categoryMap = await getCategoryMapping(userId, backupData.data.categories);
        
        // Restore transactions
        if (backupData.data.transactions?.length > 0) {
          for (const transaction of backupData.data.transactions) {
            const categoryId = categoryMap.get(transaction.category_name);
            if (categoryId) {
              await financeDB.exec`
                INSERT INTO transactions (amount, description, category_id, date, is_recurring, recurring_frequency, recurring_end_date, user_id, created_at)
                VALUES (${transaction.amount}, ${transaction.description}, ${categoryId}, ${new Date(transaction.date)}, ${transaction.is_recurring}, ${transaction.recurring_frequency}, ${transaction.recurring_end_date ? new Date(transaction.recurring_end_date) : null}, ${userId}, ${new Date(transaction.created_at)})
              `;
              restoredItems.transactions++;
            }
          }
        }
        
        // Restore budgets
        if (backupData.data.budgets?.length > 0) {
          for (const budget of backupData.data.budgets) {
            const categoryId = categoryMap.get(budget.category_name);
            if (categoryId) {
              await financeDB.exec`
                INSERT INTO budgets (category_id, amount, period, start_date, end_date, user_id, created_at)
                VALUES (${categoryId}, ${budget.amount}, ${budget.period}, ${new Date(budget.start_date)}, ${budget.end_date ? new Date(budget.end_date) : null}, ${userId}, ${new Date(budget.created_at)})
              `;
              restoredItems.budgets++;
            }
          }
        }
        
        // Restore goals
        if (backupData.data.goals?.length > 0) {
          for (const goal of backupData.data.goals) {
            await financeDB.exec`
              INSERT INTO financial_goals (name, target_amount, current_amount, target_date, description, user_id, created_at)
              VALUES (${goal.name}, ${goal.target_amount}, ${goal.current_amount}, ${goal.target_date ? new Date(goal.target_date) : null}, ${goal.description}, ${userId}, ${new Date(goal.created_at)})
            `;
            restoredItems.goals++;
          }
        }
        
        // Restore bills
        if (backupData.data.bills?.length > 0) {
          for (const bill of backupData.data.bills) {
            const categoryId = categoryMap.get(bill.category_name);
            if (categoryId) {
              await financeDB.exec`
                INSERT INTO bills (name, amount, category_id, due_date, frequency, status, description, auto_pay_enabled, reminder_days, last_paid_date, next_due_date, user_id, created_at)
                VALUES (${bill.name}, ${bill.amount}, ${categoryId}, ${new Date(bill.due_date)}, ${bill.frequency}, ${bill.status}, ${bill.description}, ${bill.auto_pay_enabled}, ${bill.reminder_days}, ${bill.last_paid_date ? new Date(bill.last_paid_date) : null}, ${new Date(bill.next_due_date)}, ${userId}, ${new Date(bill.created_at)})
              `;
              restoredItems.bills++;
            }
          }
        }
        
        // Note: Bill payments would need bill ID mapping which is more complex
        // For now, we'll skip bill payments in restoration
        
        await financeDB.exec`COMMIT`;
        
        return { restoredItems };
      } catch (err) {
        await financeDB.exec`ROLLBACK`;
        throw err;
      }
    } catch (err: any) {
      throw APIError.internal("failed to restore backup", err);
    }
  }
);

// Deletes a backup file.
export const deleteBackup = api<{ backupId: string }, void>(
  { auth: true, expose: true, method: "DELETE", path: "/backup/:backupId" },
  async (params) => {
    const auth = getAuthData()!;
    const userId = auth.userID;
    
    // Verify the backup belongs to the user
    if (!params.backupId.includes(`backup_${userId}_`)) {
      throw APIError.permissionDenied("access denied to this backup");
    }
    
    try {
      await backupBucket.remove(params.backupId);
    } catch (err: any) {
      if (err.message?.includes("not found")) {
        throw APIError.notFound("backup not found");
      }
      throw APIError.internal("failed to delete backup", err);
    }
  }
);

// Helper functions

async function getUserCategories(userId: string) {
  return await financeDB.queryAll`
    SELECT id, name, type, color, created_at
    FROM categories
    WHERE user_id = ${userId}
    ORDER BY created_at
  `;
}

async function getUserTransactions(userId: string) {
  return await financeDB.queryAll`
    SELECT t.*, c.name as category_name
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ${userId}
    ORDER BY t.created_at
  `;
}

async function getUserBudgets(userId: string) {
  return await financeDB.queryAll`
    SELECT b.*, c.name as category_name
    FROM budgets b
    JOIN categories c ON b.category_id = c.id
    WHERE b.user_id = ${userId}
    ORDER BY b.created_at
  `;
}

async function getUserGoals(userId: string) {
  return await financeDB.queryAll`
    SELECT *
    FROM financial_goals
    WHERE user_id = ${userId}
    ORDER BY created_at
  `;
}

async function getUserBills(userId: string) {
  return await financeDB.queryAll`
    SELECT b.*, c.name as category_name
    FROM bills b
    JOIN categories c ON b.category_id = c.id
    WHERE b.user_id = ${userId}
    ORDER BY b.created_at
  `;
}

async function getUserBillPayments(userId: string) {
  return await financeDB.queryAll`
    SELECT bp.*, b.name as bill_name
    FROM bill_payments bp
    JOIN bills b ON bp.bill_id = b.id
    WHERE b.user_id = ${userId}
    ORDER BY bp.created_at
  `;
}

async function clearUserData(userId: string) {
  // Delete in order to respect foreign key constraints
  await financeDB.exec`DELETE FROM bill_payments WHERE bill_id IN (SELECT id FROM bills WHERE user_id = ${userId})`;
  await financeDB.exec`DELETE FROM bills WHERE user_id = ${userId}`;
  await financeDB.exec`DELETE FROM budgets WHERE user_id = ${userId}`;
  await financeDB.exec`DELETE FROM transactions WHERE user_id = ${userId}`;
  await financeDB.exec`DELETE FROM financial_goals WHERE user_id = ${userId}`;
  await financeDB.exec`DELETE FROM categories WHERE user_id = ${userId}`;
}

async function getCategoryMapping(userId: string, backupCategories: any[]): Promise<Map<string, number>> {
  const categories = await financeDB.queryAll<{ id: number; name: string }>`
    SELECT id, name FROM categories WHERE user_id = ${userId}
  `;
  
  const map = new Map<string, number>();
  categories.forEach(cat => {
    map.set(cat.name, cat.id);
  });
  
  return map;
}

function encryptData(data: string): Buffer {
  const key = Buffer.from(encryptionKey(), 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher('aes-256-cbc', key);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return Buffer.concat([iv, Buffer.from(encrypted, 'hex')]);
}

function decryptData(encryptedData: Buffer): string {
  const key = Buffer.from(encryptionKey(), 'hex');
  const iv = encryptedData.slice(0, 16);
  const encrypted = encryptedData.slice(16);
  
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  let decrypted = decipher.update(encrypted, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
