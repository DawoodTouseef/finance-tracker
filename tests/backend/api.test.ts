import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMockDatabase, MockDatabase } from './mocks/database';
import { createMockAPIContext } from './mocks/api-context';

// Mock the database module
vi.mock('../../backend/finance/db', () => ({
  financeDB: {} // Will be replaced in beforeEach
}));

describe('Finance API Endpoints', () => {
  let mockDB: MockDatabase;

  beforeEach(() => {
    mockDB = createMockDatabase();
    // Replace the mocked database with our mock
    const dbModule = require('../../backend/finance/db');
    Object.assign(dbModule.financeDB, mockDB);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Categories API', () => {
    describe('createCategory', () => {
      it('should create a new category successfully', async () => {
        const { createCategory } = require('../../backend/finance/create_category');
        
        const mockCategory = {
          id: 1,
          name: 'Test Category',
          type: 'expense',
          color: '#ff0000',
          created_at: new Date(),
        };

        mockDB.queryRow.mockResolvedValue(mockCategory);

        const result = await createCategory({
          name: 'Test Category',
          type: 'expense',
          color: '#ff0000',
        });

        expect(result).toEqual({
          id: 1,
          name: 'Test Category',
          type: 'expense',
          color: '#ff0000',
          createdAt: mockCategory.created_at,
        });

        expect(mockDB.queryRow).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO categories'),
          'Test Category',
          'expense',
          '#ff0000'
        );
      });

      it('should validate required fields', async () => {
        const { createCategory } = require('../../backend/finance/create_category');

        await expect(createCategory({
          name: '',
          type: 'expense',
          color: '#ff0000',
        })).rejects.toThrow('name is required and cannot be empty');

        await expect(createCategory({
          name: 'Test',
          type: 'invalid' as any,
          color: '#ff0000',
        })).rejects.toThrow('type must be either \'income\' or \'expense\'');

        await expect(createCategory({
          name: 'Test',
          type: 'expense',
          color: 'invalid',
        })).rejects.toThrow('color must be a valid hex color');
      });

      it('should handle duplicate category names', async () => {
        const { createCategory } = require('../../backend/finance/create_category');

        const duplicateError = new Error('Duplicate key');
        (duplicateError as any).code = '23505';
        mockDB.queryRow.mockRejectedValue(duplicateError);

        await expect(createCategory({
          name: 'Existing Category',
          type: 'expense',
          color: '#ff0000',
        })).rejects.toThrow('category with this name already exists');
      });
    });

    describe('listCategories', () => {
      it('should return all categories', async () => {
        const { listCategories } = require('../../backend/finance/list_categories');

        const mockCategories = [
          {
            id: 1,
            name: 'Food',
            type: 'expense',
            color: '#ff0000',
            created_at: new Date(),
          },
          {
            id: 2,
            name: 'Salary',
            type: 'income',
            color: '#00ff00',
            created_at: new Date(),
          },
        ];

        mockDB.queryAll.mockResolvedValue(mockCategories);

        const result = await listCategories();

        expect(result.categories).toHaveLength(2);
        expect(result.categories[0]).toEqual({
          id: 1,
          name: 'Food',
          type: 'expense',
          color: '#ff0000',
          createdAt: mockCategories[0].created_at,
        });
      });
    });

    describe('updateCategory', () => {
      it('should update category successfully', async () => {
        const { updateCategory } = require('../../backend/finance/update_category');

        const mockUpdatedCategory = {
          id: 1,
          name: 'Updated Category',
          type: 'expense',
          color: '#ff0000',
          created_at: new Date(),
        };

        mockDB.rawQueryRow.mockResolvedValue(mockUpdatedCategory);

        const result = await updateCategory({
          id: 1,
          name: 'Updated Category',
        });

        expect(result).toEqual({
          id: 1,
          name: 'Updated Category',
          type: 'expense',
          color: '#ff0000',
          createdAt: mockUpdatedCategory.created_at,
        });
      });

      it('should handle category not found', async () => {
        const { updateCategory } = require('../../backend/finance/update_category');

        mockDB.rawQueryRow.mockResolvedValue(null);

        await expect(updateCategory({
          id: 999,
          name: 'Non-existent',
        })).rejects.toThrow('category not found');
      });
    });

    describe('deleteCategory', () => {
      it('should delete category successfully', async () => {
        const { deleteCategory } = require('../../backend/finance/delete_category');

        // Mock no existing transactions or budgets
        mockDB.queryRow
          .mockResolvedValueOnce({ count: 0 }) // transactions count
          .mockResolvedValueOnce({ count: 0 }) // budgets count
          .mockResolvedValueOnce({ id: 1 }); // delete result

        await expect(deleteCategory({ id: 1 })).resolves.not.toThrow();
      });

      it('should prevent deletion when transactions exist', async () => {
        const { deleteCategory } = require('../../backend/finance/delete_category');

        mockDB.queryRow.mockResolvedValueOnce({ count: 5 }); // transactions count

        await expect(deleteCategory({ id: 1 })).rejects.toThrow(
          'cannot delete category with existing transactions'
        );
      });

      it('should prevent deletion when budgets exist', async () => {
        const { deleteCategory } = require('../../backend/finance/delete_category');

        mockDB.queryRow
          .mockResolvedValueOnce({ count: 0 }) // transactions count
          .mockResolvedValueOnce({ count: 2 }); // budgets count

        await expect(deleteCategory({ id: 1 })).rejects.toThrow(
          'cannot delete category with existing budgets'
        );
      });
    });
  });

  describe('Transactions API', () => {
    describe('createTransaction', () => {
      it('should create a new transaction successfully', async () => {
        const { createTransaction } = require('../../backend/finance/create_transaction');

        const mockTransaction = {
          id: 1,
          amount: 100.50,
          description: 'Test Transaction',
          category_id: 1,
          date: new Date('2024-01-01'),
          is_recurring: false,
          recurring_frequency: null,
          recurring_end_date: null,
          created_at: new Date(),
        };

        // Mock category exists
        mockDB.queryRow.mockResolvedValueOnce({ id: 1 });
        // Mock transaction creation
        mockDB.queryRow.mockResolvedValueOnce(mockTransaction);

        const result = await createTransaction({
          amount: 100.50,
          description: 'Test Transaction',
          categoryId: 1,
          date: new Date('2024-01-01'),
          isRecurring: false,
        });

        expect(result).toEqual({
          id: 1,
          amount: 100.50,
          description: 'Test Transaction',
          categoryId: 1,
          date: new Date('2024-01-01'),
          isRecurring: false,
          recurringFrequency: undefined,
          recurringEndDate: undefined,
          createdAt: mockTransaction.created_at,
        });
      });

      it('should validate transaction data', async () => {
        const { createTransaction } = require('../../backend/finance/create_transaction');

        await expect(createTransaction({
          amount: 0,
          description: 'Test',
          categoryId: 1,
          date: new Date(),
        })).rejects.toThrow('amount must be greater than 0');

        await expect(createTransaction({
          amount: 100,
          description: '',
          categoryId: 1,
          date: new Date(),
        })).rejects.toThrow('description is required and cannot be empty');

        await expect(createTransaction({
          amount: 100,
          description: 'Test',
          categoryId: 0,
          date: new Date(),
        })).rejects.toThrow('valid categoryId is required');
      });

      it('should handle recurring transaction validation', async () => {
        const { createTransaction } = require('../../backend/finance/create_transaction');

        await expect(createTransaction({
          amount: 100,
          description: 'Test',
          categoryId: 1,
          date: new Date(),
          isRecurring: true,
          // Missing recurringFrequency
        })).rejects.toThrow('recurringFrequency is required for recurring transactions');

        await expect(createTransaction({
          amount: 100,
          description: 'Test',
          categoryId: 1,
          date: new Date('2024-01-01'),
          isRecurring: true,
          recurringFrequency: 'monthly',
          recurringEndDate: new Date('2023-12-31'), // Before start date
        })).rejects.toThrow('recurringEndDate must be after the transaction date');
      });
    });

    describe('listTransactions', () => {
      it('should return paginated transactions', async () => {
        const { listTransactions } = require('../../backend/finance/list_transactions');

        const mockTransactions = [
          {
            id: 1,
            amount: 100,
            description: 'Test 1',
            category_id: 1,
            date: new Date(),
            is_recurring: false,
            recurring_frequency: null,
            recurring_end_date: null,
            created_at: new Date(),
            category_name: 'Food',
            category_type: 'expense',
            category_color: '#ff0000',
            category_created_at: new Date(),
          },
        ];

        const mockCount = { total: 1 };

        mockDB.rawQueryAll.mockResolvedValue(mockTransactions);
        mockDB.rawQueryRow.mockResolvedValue(mockCount);

        const result = await listTransactions({ limit: 10, offset: 0 });

        expect(result.transactions).toHaveLength(1);
        expect(result.total).toBe(1);
        expect(result.transactions[0]).toEqual({
          id: 1,
          amount: 100,
          description: 'Test 1',
          categoryId: 1,
          date: mockTransactions[0].date,
          isRecurring: false,
          recurringFrequency: undefined,
          recurringEndDate: undefined,
          createdAt: mockTransactions[0].created_at,
          category: {
            id: 1,
            name: 'Food',
            type: 'expense',
            color: '#ff0000',
            createdAt: mockTransactions[0].category_created_at,
          },
        });
      });

      it('should handle filtering by categories', async () => {
        const { listTransactions } = require('../../backend/finance/list_transactions');

        mockDB.rawQueryAll.mockResolvedValue([]);
        mockDB.rawQueryRow.mockResolvedValue({ total: 0 });

        await listTransactions({ categoryIds: '1,2,3' });

        expect(mockDB.rawQueryAll).toHaveBeenCalledWith(
          expect.stringContaining('t.category_id IN'),
          1, 2, 3, 50, 0
        );
      });

      it('should handle date range filtering', async () => {
        const { listTransactions } = require('../../backend/finance/list_transactions');

        mockDB.rawQueryAll.mockResolvedValue([]);
        mockDB.rawQueryRow.mockResolvedValue({ total: 0 });

        await listTransactions({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });

        expect(mockDB.rawQueryAll).toHaveBeenCalledWith(
          expect.stringContaining('t.date >='),
          '2024-01-01', '2024-01-31', 50, 0
        );
      });
    });
  });

  describe('Budgets API', () => {
    describe('createBudget', () => {
      it('should create a new budget successfully', async () => {
        const { createBudget } = require('../../backend/finance/create_budget');

        const mockBudget = {
          id: 1,
          category_id: 1,
          amount: 500,
          period: 'monthly',
          start_date: new Date('2024-01-01'),
          end_date: null,
          created_at: new Date(),
        };

        // Mock category exists and is expense type
        mockDB.queryRow.mockResolvedValueOnce({ id: 1, type: 'expense' });
        // Mock no overlapping budgets
        mockDB.queryRow.mockResolvedValueOnce(null);
        // Mock budget creation
        mockDB.queryRow.mockResolvedValueOnce(mockBudget);

        const result = await createBudget({
          categoryId: 1,
          amount: 500,
          period: 'monthly',
          startDate: new Date('2024-01-01'),
        });

        expect(result).toEqual({
          id: 1,
          categoryId: 1,
          amount: 500,
          period: 'monthly',
          startDate: new Date('2024-01-01'),
          endDate: undefined,
          createdAt: mockBudget.created_at,
        });
      });

      it('should prevent budgets for income categories', async () => {
        const { createBudget } = require('../../backend/finance/create_budget');

        mockDB.queryRow.mockResolvedValueOnce({ id: 1, type: 'income' });

        await expect(createBudget({
          categoryId: 1,
          amount: 500,
          period: 'monthly',
          startDate: new Date('2024-01-01'),
        })).rejects.toThrow('budgets can only be created for expense categories');
      });

      it('should prevent overlapping budgets', async () => {
        const { createBudget } = require('../../backend/finance/create_budget');

        // Mock category exists and is expense type
        mockDB.queryRow.mockResolvedValueOnce({ id: 1, type: 'expense' });
        // Mock overlapping budget exists
        mockDB.queryRow.mockResolvedValueOnce({ id: 2 });

        await expect(createBudget({
          categoryId: 1,
          amount: 500,
          period: 'monthly',
          startDate: new Date('2024-01-01'),
        })).rejects.toThrow('a budget already exists for this category in the specified date range');
      });
    });

    describe('listBudgets', () => {
      it('should return budgets with spending information', async () => {
        const { listBudgets } = require('../../backend/finance/list_budgets');

        const mockBudgets = [
          {
            id: 1,
            category_id: 1,
            amount: 500,
            period: 'monthly',
            start_date: new Date('2024-01-01'),
            end_date: null,
            created_at: new Date(),
            category_name: 'Food',
            category_type: 'expense',
            category_color: '#ff0000',
            category_created_at: new Date(),
            spent: 250,
          },
        ];

        mockDB.queryAll.mockResolvedValue(mockBudgets);

        const result = await listBudgets();

        expect(result.budgets).toHaveLength(1);
        expect(result.budgets[0].spent).toBe(250);
        expect(result.budgets[0].category.name).toBe('Food');
      });
    });
  });

  describe('Bills API', () => {
    describe('createBill', () => {
      it('should create a new bill successfully', async () => {
        const { createBill } = require('../../backend/finance/create_bill');

        const mockBill = {
          id: 1,
          name: 'Electric Bill',
          amount: 150,
          category_id: 1,
          due_date: new Date('2024-01-15'),
          frequency: 'monthly',
          status: 'pending',
          description: null,
          auto_pay_enabled: false,
          reminder_days: 3,
          last_paid_date: null,
          next_due_date: new Date('2024-01-15'),
          created_at: new Date(),
        };

        // Mock category exists and is expense type
        mockDB.queryRow.mockResolvedValueOnce({ id: 1, type: 'expense' });
        // Mock bill creation
        mockDB.queryRow.mockResolvedValueOnce(mockBill);

        const result = await createBill({
          name: 'Electric Bill',
          amount: 150,
          categoryId: 1,
          dueDate: new Date('2024-01-15'),
          frequency: 'monthly',
        });

        expect(result).toEqual({
          id: 1,
          name: 'Electric Bill',
          amount: 150,
          categoryId: 1,
          dueDate: new Date('2024-01-15'),
          frequency: 'monthly',
          status: 'pending',
          description: undefined,
          autoPayEnabled: false,
          reminderDays: 3,
          lastPaidDate: undefined,
          nextDueDate: new Date('2024-01-15'),
          createdAt: mockBill.created_at,
        });
      });

      it('should validate bill data', async () => {
        const { createBill } = require('../../backend/finance/create_bill');

        await expect(createBill({
          name: '',
          amount: 150,
          categoryId: 1,
          dueDate: new Date(),
          frequency: 'monthly',
        })).rejects.toThrow('name is required and cannot be empty');

        await expect(createBill({
          name: 'Test Bill',
          amount: 0,
          categoryId: 1,
          dueDate: new Date(),
          frequency: 'monthly',
        })).rejects.toThrow('amount must be greater than 0');

        await expect(createBill({
          name: 'Test Bill',
          amount: 150,
          categoryId: 1,
          dueDate: new Date(),
          frequency: 'invalid' as any,
        })).rejects.toThrow('frequency must be daily, weekly, monthly, or yearly');
      });
    });

    describe('markBillPaid', () => {
      it('should mark bill as paid successfully', async () => {
        const { markBillPaid } = require('../../backend/finance/mark_bill_paid');

        const mockBill = {
          id: 1,
          name: 'Electric Bill',
          amount: 150,
          frequency: 'monthly',
          due_date: new Date('2024-01-15'),
          next_due_date: new Date('2024-01-15'),
        };

        const mockPayment = {
          id: 1,
          bill_id: 1,
          transaction_id: null,
          amount: 150,
          paid_date: new Date('2024-01-15'),
          is_auto_detected: false,
          notes: null,
          created_at: new Date(),
        };

        // Mock bill exists
        mockDB.queryRow.mockResolvedValueOnce(mockBill);
        // Mock payment creation
        mockDB.queryRow.mockResolvedValueOnce(mockPayment);
        // Mock transaction operations
        mockDB.exec.mockResolvedValue(undefined);

        const result = await markBillPaid({
          id: 1,
          amount: 150,
          paidDate: new Date('2024-01-15'),
        });

        expect(result.payment).toEqual({
          id: 1,
          billId: 1,
          transactionId: undefined,
          amount: 150,
          paidDate: new Date('2024-01-15'),
          isAutoDetected: false,
          notes: undefined,
          createdAt: mockPayment.created_at,
        });

        expect(result.nextDueDate).toBeInstanceOf(Date);
      });

      it('should handle bill not found', async () => {
        const { markBillPaid } = require('../../backend/finance/mark_bill_paid');

        mockDB.queryRow.mockResolvedValueOnce(null);

        await expect(markBillPaid({
          id: 999,
          amount: 150,
        })).rejects.toThrow('bill not found');
      });
    });

    describe('getBillReminders', () => {
      it('should return bill reminders', async () => {
        const { getBillReminders } = require('../../backend/finance/bill_reminders');

        const mockBills = [
          {
            id: 1,
            name: 'Electric Bill',
            amount: 150,
            next_due_date: new Date('2024-01-15'),
            reminder_days: 3,
            category_name: 'Utilities',
            category_color: '#ff0000',
          },
        ];

        // Mock update overdue bills
        mockDB.exec.mockResolvedValueOnce(undefined);
        // Mock get reminder bills
        mockDB.queryAll.mockResolvedValueOnce(mockBills);

        const result = await getBillReminders();

        expect(result.reminders).toHaveLength(1);
        expect(result.reminders[0]).toEqual({
          billId: 1,
          billName: 'Electric Bill',
          amount: 150,
          categoryName: 'Utilities',
          categoryColor: '#ff0000',
          dueDate: new Date('2024-01-15'),
          daysUntilDue: expect.any(Number),
          isOverdue: expect.any(Boolean),
        });
      });
    });
  });

  describe('Goals API', () => {
    describe('createGoal', () => {
      it('should create a new goal successfully', async () => {
        const { createGoal } = require('../../backend/finance/create_goal');

        const mockGoal = {
          id: 1,
          name: 'Emergency Fund',
          target_amount: 10000,
          current_amount: 0,
          target_date: new Date('2024-12-31'),
          description: 'Save for emergencies',
          created_at: new Date(),
        };

        mockDB.queryRow.mockResolvedValue(mockGoal);

        const result = await createGoal({
          name: 'Emergency Fund',
          targetAmount: 10000,
          currentAmount: 0,
          targetDate: new Date('2024-12-31'),
          description: 'Save for emergencies',
        });

        expect(result).toEqual({
          id: 1,
          name: 'Emergency Fund',
          targetAmount: 10000,
          currentAmount: 0,
          targetDate: new Date('2024-12-31'),
          description: 'Save for emergencies',
          createdAt: mockGoal.created_at,
        });
      });

      it('should validate goal data', async () => {
        const { createGoal } = require('../../backend/finance/create_goal');

        await expect(createGoal({
          name: '',
          targetAmount: 10000,
        })).rejects.toThrow('name is required and cannot be empty');

        await expect(createGoal({
          name: 'Test Goal',
          targetAmount: 0,
        })).rejects.toThrow('targetAmount must be greater than 0');

        await expect(createGoal({
          name: 'Test Goal',
          targetAmount: 10000,
          currentAmount: -100,
        })).rejects.toThrow('currentAmount cannot be negative');

        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);

        await expect(createGoal({
          name: 'Test Goal',
          targetAmount: 10000,
          targetDate: pastDate,
        })).rejects.toThrow('targetDate cannot be in the past');
      });
    });
  });

  describe('Reports API', () => {
    describe('getReports', () => {
      it('should generate financial reports', async () => {
        const { getReports } = require('../../backend/finance/get_reports');

        const mockSummaryData = [
          {
            type: 'income',
            category_id: 1,
            category_name: 'Salary',
            category_color: '#00ff00',
            total: 5000,
            transaction_count: 1,
          },
          {
            type: 'expense',
            category_id: 2,
            category_name: 'Food',
            category_color: '#ff0000',
            total: 500,
            transaction_count: 10,
          },
        ];

        const mockMonthlyTrends = [
          {
            month: '2024-01',
            income: 5000,
            expenses: 1500,
          },
        ];

        mockDB.queryAll
          .mockResolvedValueOnce(mockSummaryData)
          .mockResolvedValueOnce(mockMonthlyTrends);

        const result = await getReports({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });

        expect(result.totalIncome).toBe(5000);
        expect(result.totalExpenses).toBe(500);
        expect(result.netIncome).toBe(4500);
        expect(result.incomeByCategory).toHaveLength(1);
        expect(result.expensesByCategory).toHaveLength(1);
        expect(result.monthlyTrends).toHaveLength(1);
        expect(result.monthlyTrends[0].net).toBe(3500);
      });
    });
  });

  describe('CSV Import/Export', () => {
    describe('exportCsv', () => {
      it('should export transactions to CSV', async () => {
        const { exportCsv } = require('../../backend/finance/export_csv');

        const mockTransactions = [
          {
            date: new Date('2024-01-01'),
            description: 'Test Transaction',
            amount: 100,
            category_name: 'Food',
            category_type: 'expense',
            is_recurring: false,
            recurring_frequency: null,
            recurring_end_date: null,
            created_at: new Date(),
          },
        ];

        mockDB.rawQueryAll.mockResolvedValue(mockTransactions);

        const result = await exportCsv({});

        expect(result.csvData).toContain('Date,Description,Amount');
        expect(result.csvData).toContain('Test Transaction');
        expect(result.recordCount).toBe(1);
        expect(result.filename).toMatch(/transactions_export_\d{4}-\d{2}-\d{2}\.csv/);
      });
    });

    describe('importCsv', () => {
      it('should import transactions from CSV', async () => {
        const { importCsv } = require('../../backend/finance/import_csv');

        const csvData = 'Date,Description,Amount\n2024-01-01,Test Transaction,100.00';

        // Mock categories
        mockDB.queryAll.mockResolvedValueOnce([
          { id: 1, name: 'food', type: 'expense' },
        ]);

        // Mock no existing transaction
        mockDB.queryRow.mockResolvedValueOnce(null);

        // Mock successful insert
        mockDB.exec.mockResolvedValueOnce(undefined);

        const result = await importCsv({
          csvData,
          mapping: {
            dateColumn: 0,
            descriptionColumn: 1,
            amountColumn: 2,
          },
          defaultCategoryId: 1,
          skipFirstRow: true,
        });

        expect(result.totalRows).toBe(1);
        expect(result.successfulImports).toBe(1);
        expect(result.errors).toHaveLength(0);
        expect(result.duplicatesSkipped).toBe(0);
      });

      it('should handle CSV parsing errors', async () => {
        const { importCsv } = require('../../backend/finance/import_csv');

        const csvData = 'Date,Description,Amount\ninvalid-date,Test,invalid-amount';

        mockDB.queryAll.mockResolvedValueOnce([]);

        const result = await importCsv({
          csvData,
          mapping: {
            dateColumn: 0,
            descriptionColumn: 1,
            amountColumn: 2,
          },
          defaultCategoryId: 1,
          skipFirstRow: true,
        });

        expect(result.totalRows).toBe(1);
        expect(result.successfulImports).toBe(0);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Insights API', () => {
    describe('getInsights', () => {
      it('should generate financial insights', async () => {
        const { getInsights } = require('../../backend/finance/insights');

        // Mock spending trends
        const mockSpendingTrends = [
          {
            month: '2024-01',
            category_id: 1,
            category_name: 'Food',
            category_color: '#ff0000',
            amount: 500,
            transaction_count: 10,
          },
        ];

        // Mock category comparisons
        const mockCurrentPeriod = [
          {
            category_id: 1,
            category_name: 'Food',
            category_color: '#ff0000',
            amount: 500,
          },
        ];

        const mockPreviousPeriod = [
          {
            category_id: 1,
            amount: 400,
          },
        ];

        // Mock budget performance
        const mockBudgets = [
          {
            id: 1,
            category_id: 1,
            category_name: 'Food',
            category_color: '#ff0000',
            amount: 600,
            period: 'monthly',
            start_date: new Date('2024-01-01'),
            end_date: null,
            spent: 500,
          },
        ];

        // Mock monthly data for summary
        const mockMonthlyData = [
          {
            month: '2024-01',
            income: 5000,
            expenses: 1500,
          },
        ];

        // Mock goals
        const mockGoals = [
          {
            id: 1,
            name: 'Emergency Fund',
            target_amount: 10000,
            current_amount: 2000,
            target_date: new Date('2024-12-31'),
          },
        ];

        mockDB.queryAll
          .mockResolvedValueOnce(mockSpendingTrends) // spending trends
          .mockResolvedValueOnce(mockCurrentPeriod) // current period
          .mockResolvedValueOnce(mockPreviousPeriod) // previous period
          .mockResolvedValueOnce(mockBudgets) // budget performance
          .mockResolvedValueOnce(mockMonthlyData) // monthly data
          .mockResolvedValueOnce(mockGoals); // goals

        // Mock income/expense totals
        mockDB.queryRow
          .mockResolvedValueOnce({ total: 5000 }) // total income
          .mockResolvedValueOnce({ total: 1500 }); // total expenses

        const result = await getInsights({ months: 6 });

        expect(result.spendingTrends).toHaveLength(1);
        expect(result.categoryComparisons).toHaveLength(1);
        expect(result.budgetPerformance).toHaveLength(1);
        expect(result.recommendations).toBeDefined();
        expect(result.summary).toBeDefined();

        // Check category comparison calculation
        expect(result.categoryComparisons[0].changePercentage).toBe(25); // (500-400)/400 * 100

        // Check budget performance
        expect(result.budgetPerformance[0].utilizationPercentage).toBeCloseTo(83.33, 2); // 500/600 * 100
      });
    });
  });
});
