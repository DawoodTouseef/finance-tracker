# Deploying to Vercel

This guide provides instructions for deploying the Finance Tracker application to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. The Vercel CLI installed (optional, for local testing)

## Deployment Steps

### 1. Push your code to a Git repository

Make sure your code is pushed to a Git repository (GitHub, GitLab, or Bitbucket).

### 2. Import your project in Vercel

1. Log in to your Vercel account
2. Click "Add New" → "Project"
3. Select your Git repository
4. Configure the project settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `frontend/dist`
   - **Install Command**: `npm install`

### 3. Configure Environment Variables

Add the following environment variables in the Vercel project settings:

- `NODE_ENV`: `production`

### 4. Deploy

Click "Deploy" and wait for the deployment to complete.

## Troubleshooting

### GlobalError Issue

If you encounter a `GlobalError` during deployment, it's likely due to one of these issues:

1. **Server-side rendering issues**: The application has been updated to handle server-side rendering properly by checking for the existence of the `window` object before accessing it.

2. **Environment variables**: Make sure the `NODE_ENV` environment variable is set to `production` in your Vercel project settings.

3. **API endpoints**: The application is configured to use relative paths for API requests in production. If you're still experiencing issues, check the network requests in your browser's developer tools.

## Project Structure

The project has been configured for Vercel deployment with the following files:

- `vercel.json`: Main configuration file for Vercel deployment
- `backend/vercel.json`: Configuration for the backend API
- `api/index.js`: Serverless function to handle API requests

## Local Testing

To test the production build locally before deploying:

```bash
npm run build
cd frontend && npm run preview
```

This will build the frontend and serve it locally, allowing you to verify that everything works as expected.