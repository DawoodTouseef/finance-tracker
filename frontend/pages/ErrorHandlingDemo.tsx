import React from 'react';
import { ExampleErrorHandling } from '../components/ExampleErrorHandling';

/**
 * Demo page for showcasing the improved error handling system
 */
export default function ErrorHandlingDemo() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">Error Handling Demo</h1>
        <p className="text-muted-foreground">
          This page demonstrates the improved error handling system with retry capabilities,
          network error detection, and consistent error messages.
        </p>
      </div>
      
      <ExampleErrorHandling />
      
      <div className="mt-8 p-4 bg-muted rounded-lg">
        <h2 className="text-xl font-semibold mb-2">How It Works</h2>
        <p className="mb-4">
          The error handling system provides consistent error handling across the application:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Network errors are automatically detected and displayed with retry options</li>
          <li>API errors include status codes and error messages from the server</li>
          <li>Timeout errors are handled gracefully with retry options</li>
          <li>Authentication errors redirect to login</li>
          <li>All errors are logged to the console for debugging</li>
        </ul>
      </div>
    </div>
  );
}