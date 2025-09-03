import { useEffect, useState } from 'react';
import { AlertCircle, WifiOff, Wifi } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Component that monitors network connectivity and provides visual feedback
 * when the application is offline or experiences connectivity issues
 */
export default function NetworkStatusMonitor() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Function to handle online status changes
    const handleOnline = () => {
      setIsOnline(true);
      
      // If we were previously offline, show a toast and refetch data
      if (wasOffline) {
        toast({
          title: 'Connection Restored',
          description: 'Your internet connection has been restored. Data will be refreshed.',
          variant: 'default',
          action: {
            label: 'Refresh Now',
            onClick: () => queryClient.refetchQueries()
          }
        });
        
        // Automatically refetch all queries when connection is restored
        queryClient.refetchQueries();
        setWasOffline(false);
      }
    };

    // Function to handle offline status changes
    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      
      toast({
        title: 'You are offline',
        description: 'Please check your internet connection. Some features may be unavailable.',
        variant: 'destructive',
        duration: 5000,
      });
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Clean up event listeners on component unmount
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast, queryClient, wasOffline]);

  // If online, don't render anything
  if (isOnline) return null;

  // Render offline indicator
  return (
    <div className="fixed bottom-4 right-4 bg-destructive text-destructive-foreground px-4 py-2 rounded-md shadow-lg flex items-center gap-2 z-50">
      <WifiOff size={18} />
      <span>You are offline</span>
    </div>
  );
}