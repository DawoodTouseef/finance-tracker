// Simple Express server to replace Encore
import express from 'express';
import cors from 'cors';
const app = express();
const port = 4000;

app.use(cors());
app.use(express.json());

// Mock authentication endpoint
app.post('/auth/login', (req, res) => {
  res.json({ success: true, message: 'Authentication successful', userId: 'mock-user-id' });
});

// Mock transactions endpoints
app.get('/transactions', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : 10;
  const transactions = [
    { id: '1', amount: 100, description: 'Groceries', date: new Date().toISOString(), type: 'expense', category: 'Food' },
    { id: '2', amount: 2000, description: 'Salary', date: new Date().toISOString(), type: 'income', category: 'Salary' },
    { id: '3', amount: 50, description: 'Gas', date: new Date().toISOString(), type: 'expense', category: 'Transportation' },
    { id: '4', amount: 200, description: 'Dinner', date: new Date().toISOString(), type: 'expense', category: 'Food' },
    { id: '5', amount: 500, description: 'Rent', date: new Date().toISOString(), type: 'expense', category: 'Housing' },
  ];
  res.json(transactions.slice(0, limit));
});

// Mock categories endpoint
app.get('/categories', (req, res) => {
  res.json([
    { id: '1', name: 'Food', color: '#FF5733' },
    { id: '2', name: 'Salary', color: '#33FF57' },
    { id: '3', name: 'Transportation', color: '#3357FF' },
    { id: '4', name: 'Housing', color: '#B033FF' },
  ]);
});

// Mock budgets endpoint
app.get('/budgets', (req, res) => {
  res.json([
    { id: '1', name: 'Food Budget', amount: 500, spent: 300, category: 'Food', period: 'monthly' },
    { id: '2', name: 'Transportation Budget', amount: 200, spent: 50, category: 'Transportation', period: 'monthly' },
    { id: '3', name: 'Housing Budget', amount: 1000, spent: 500, category: 'Housing', period: 'monthly' },
  ]);
});

// Mock bills endpoints
app.get('/bills', (req, res) => {
  const dueSoon = req.query.dueSoon === 'true';
  const bills = [
    { id: '1', name: 'Rent', amount: 1000, dueDate: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString(), recurring: true, paid: false },
    { id: '2', name: 'Electricity', amount: 100, dueDate: new Date(new Date().setDate(new Date().getDate() + 10)).toISOString(), recurring: true, paid: false },
    { id: '3', name: 'Internet', amount: 50, dueDate: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString(), recurring: true, paid: false },
  ];
  
  if (dueSoon) {
    // Return bills due within the next 7 days
    const sevenDaysFromNow = new Date(new Date().setDate(new Date().getDate() + 7));
    return res.json(bills.filter(bill => new Date(bill.dueDate) <= sevenDaysFromNow && !bill.paid));
  }
  
  res.json(bills);
});

app.get('/bills/reminders', (req, res) => {
  res.json([
    { id: '1', billId: '1', message: 'Rent due in 5 days', date: new Date().toISOString() },
    { id: '2', billId: '2', message: 'Electricity due in 10 days', date: new Date().toISOString() },
  ]);
});

// Mock goals endpoint
app.get('/goals', (req, res) => {
  res.json([
    { id: '1', name: 'Vacation', targetAmount: 2000, currentAmount: 500, deadline: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString() },
    { id: '2', name: 'New Laptop', targetAmount: 1000, currentAmount: 200, deadline: new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString() },
  ]);
});

// Mock notifications endpoint
app.get('/notifications/budget-alerts', (req, res) => {
  res.json([
    { id: '1', message: 'Food budget at 60% usage', date: new Date().toISOString(), read: false },
    { id: '2', message: 'Housing budget at 50% usage', date: new Date().toISOString(), read: false },
  ]);
});

app.listen(port, () => {
  console.log(`Finance tracker backend running at http://localhost:${port}`);
});