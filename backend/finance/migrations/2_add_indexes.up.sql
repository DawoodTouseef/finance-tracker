-- Add indexes for frequently queried columns to improve performance

-- Index on transactions table for date-based queries
CREATE INDEX idx_transactions_date ON transactions(date);

-- Index on transactions table for category-based queries
CREATE INDEX idx_transactions_category_id ON transactions(category_id);

-- Index on transactions table for amount-based queries
CREATE INDEX idx_transactions_amount ON transactions(amount);

-- Composite index for date range and category queries (most common combination)
CREATE INDEX idx_transactions_date_category ON transactions(date, category_id);

-- Index on budgets table for category-based queries
CREATE INDEX idx_budgets_category_id ON budgets(category_id);

-- Index on budgets table for date range queries
CREATE INDEX idx_budgets_start_date ON budgets(start_date);
CREATE INDEX idx_budgets_end_date ON budgets(end_date);

-- Composite index for budget date range queries
CREATE INDEX idx_budgets_date_range ON budgets(start_date, end_date);

-- Index on financial_goals table for target_date queries
CREATE INDEX idx_financial_goals_target_date ON financial_goals(target_date);

-- Index on categories table for type-based queries
CREATE INDEX idx_categories_type ON categories(type);
