-- Add user_id column to all tables for multi-user support

-- Add user_id to categories
ALTER TABLE categories ADD COLUMN user_id TEXT;
CREATE INDEX idx_categories_user_id ON categories(user_id);

-- Add user_id to transactions
ALTER TABLE transactions ADD COLUMN user_id TEXT;
CREATE INDEX idx_transactions_user_id ON transactions(user_id);

-- Add user_id to budgets
ALTER TABLE budgets ADD COLUMN user_id TEXT;
CREATE INDEX idx_budgets_user_id ON budgets(user_id);

-- Add user_id to financial_goals
ALTER TABLE financial_goals ADD COLUMN user_id TEXT;
CREATE INDEX idx_financial_goals_user_id ON financial_goals(user_id);

-- Add user_id to bills
ALTER TABLE bills ADD COLUMN user_id TEXT;
CREATE INDEX idx_bills_user_id ON bills(user_id);

-- Update unique constraints to include user_id
ALTER TABLE categories DROP CONSTRAINT categories_name_key;
ALTER TABLE categories ADD CONSTRAINT categories_name_user_unique UNIQUE (name, user_id);

-- Create composite indexes for better performance
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date);
CREATE INDEX idx_transactions_user_category ON transactions(user_id, category_id);
CREATE INDEX idx_budgets_user_category ON budgets(user_id, category_id);
CREATE INDEX idx_bills_user_status ON bills(user_id, status);
CREATE INDEX idx_bills_user_next_due ON bills(user_id, next_due_date);
