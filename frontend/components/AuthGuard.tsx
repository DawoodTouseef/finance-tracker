import { useAuth } from "@clerk/clerk-react";
import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn } from "lucide-react";

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome to FinanceTracker</CardTitle>
            <p className="text-gray-600">Please sign in to access your financial data</p>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              onClick={() => window.location.href = '/sign-in'}
              className="w-full"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Sign In
            </Button>
            <p className="text-sm text-gray-500 mt-4">
              Don't have an account?{" "}
              <button 
                onClick={() => window.location.href = '/sign-up'}
                className="text-blue-600 hover:underline"
              >
                Sign up
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
