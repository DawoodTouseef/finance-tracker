import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEnhancedQuery } from '../hooks/useEnhancedQuery';
import { useEnhancedMutation } from '../hooks/useEnhancedMutation';
import { DataFetchWrapper } from './DataFetchWrapper';
import { ApiErrorMessage } from './ApiErrorMessage';
import backend from '~backend/client';

/**
 * Example component demonstrating the improved error handling capabilities
 * This component shows how to use useEnhancedQuery and useEnhancedMutation
 * with the DataFetchWrapper and ApiErrorMessage components
 */
export function ExampleErrorHandling() {
  const [showError, setShowError] = useState(false);
  
  // Example query with enhanced error handling
  const query = useEnhancedQuery(
    ['example-data'],
    async () => {
      // Simulate an error if showError is true
      if (showError) {
        // This will be caught and handled by useEnhancedQuery
        throw new Error('Simulated query error');
      }
      
      // Normal query function
      return { message: 'Query successful!' };
    },
    {
      // Custom error message
      errorMessage: 'Failed to load example data',
      // Disable automatic refetching on window focus
      refetchOnWindowFocus: false
    }
  );
  
  // Example mutation with enhanced error handling
  const mutation = useEnhancedMutation(
    async (data: { name: string }) => {
      // Simulate an error if showError is true
      if (showError) {
        // This will be caught and handled by useEnhancedMutation
        throw new Error('Simulated mutation error');
      }
      
      // Normal mutation function
      return { success: true, message: 'Mutation successful!' };
    },
    {
      // Custom error message
      errorMessage: 'Failed to save data'
    }
  );
  
  // Function to trigger the mutation
  const handleSubmit = () => {
    mutation.mutate({ name: 'Example' });
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Error Handling Example</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => setShowError(!showError)}
            >
              {showError ? 'Disable' : 'Enable'} Error Simulation
            </Button>
            
            <Button 
              onClick={handleSubmit} 
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Saving...' : 'Trigger Mutation'}
            </Button>
          </div>
          
          {/* Display mutation error */}
          {mutation.error && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Mutation Error:</h3>
              <ApiErrorMessage error={mutation.errorDetails} onRetry={handleSubmit} />
            </div>
          )}
          
          {/* Display mutation success */}
          {mutation.isSuccess && (
            <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-md">
              Mutation completed successfully!
            </div>
          )}
          
          {/* Use DataFetchWrapper to handle loading and error states */}
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Query Result:</h3>
            <DataFetchWrapper
              isLoading={query.isLoading}
              isError={query.isError}
              error={query.errorDetails}
              onRetry={() => query.refetch()}
            >
              <div className="p-4 bg-blue-50 text-blue-700 rounded-md">
                {JSON.stringify(query.data)}
              </div>
            </DataFetchWrapper>
          </div>
          
          {/* Show detailed error information */}
          {(query.errorDetails || mutation.errorDetails) && (
            <div className="mt-6 border-t pt-4">
              <h3 className="text-sm font-medium mb-2">Error Details:</h3>
              <pre className="bg-gray-100 p-4 rounded-md text-xs overflow-auto">
                {JSON.stringify(
                  query.errorDetails || mutation.errorDetails, 
                  null, 
                  2
                )}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}