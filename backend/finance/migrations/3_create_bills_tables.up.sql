-- Bills table for recurring bill management
CREATE TABLE bills (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  category_id BIGINT NOT NULL REFERENCES categories(id),
  due_date DATE NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  description TEXT,
  auto_pay_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_days INTEGER NOT NULL DEFAULT 3,
  last_paid_date DATE,
  next_due_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bill payments table to track payment history
CREATE TABLE bill_payments (
  id BIGSERIAL PRIMARY KEY,
  bill_id BIGINT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  transaction_id BIGINT REFERENCES transactions(id) ON DELETE SET NULL,
  amount DOUBLE PRECISION NOT NULL,
  paid_date DATE NOT NULL,
  is_auto_detected BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for bills
CREATE INDEX idx_bills_category_id ON bills(category_id);
CREATE INDEX idx_bills_due_date ON bills(due_date);
CREATE INDEX idx_bills_next_due_date ON bills(next_due_date);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_frequency ON bills(frequency);

-- Indexes for bill payments
CREATE INDEX idx_bill_payments_bill_id ON bill_payments(bill_id);
CREATE INDEX idx_bill_payments_transaction_id ON bill_payments(transaction_id);
CREATE INDEX idx_bill_payments_paid_date ON bill_payments(paid_date);
