CREATE TABLE categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE transactions (
  id BIGSERIAL PRIMARY KEY,
  amount DOUBLE PRECISION NOT NULL,
  description TEXT NOT NULL,
  category_id BIGINT NOT NULL REFERENCES categories(id),
  date DATE NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurring_frequency TEXT CHECK (recurring_frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  recurring_end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE budgets (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT NOT NULL REFERENCES categories(id),
  amount DOUBLE PRECISION NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('monthly', 'yearly')),
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE financial_goals (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  target_amount DOUBLE PRECISION NOT NULL,
  current_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
  target_date DATE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, type, color) VALUES
  ('Salary', 'income', '#10b981'),
  ('Freelance', 'income', '#059669'),
  ('Investment', 'income', '#047857'),
  ('Food & Dining', 'expense', '#ef4444'),
  ('Transportation', 'expense', '#f97316'),
  ('Shopping', 'expense', '#eab308'),
  ('Entertainment', 'expense', '#8b5cf6'),
  ('Bills & Utilities', 'expense', '#06b6d4'),
  ('Healthcare', 'expense', '#ec4899'),
  ('Education', 'expense', '#3b82f6'),
  ('Travel', 'expense', '#84cc16'),
  ('Other', 'expense', '#6b7280');
