// Vercel serverless function to proxy requests to the backend
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

// Create Express server
const app = express();

// Proxy API requests to the backend
app.use('/', createProxyMiddleware({
  target: 'http://localhost:4000',
  changeOrigin: true,
}));

export default app;