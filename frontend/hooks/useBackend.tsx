import { useAuth } from "@clerk/clerk-react";
import backend from "~backend/client";

// Returns the backend client with authentication.
export function useBackend() {
  const { getToken, isSignedIn } = useAuth();
  
  if (!isSignedIn) return backend;
  
  return backend.with({
    auth: async () => {
      const token = await getToken();
      return token ? { authorization: `Bearer ${token}` } : {};
    }
  });
}
