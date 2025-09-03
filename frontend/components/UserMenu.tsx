import { useAuth, useUser } from "@clerk/clerk-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Settings, LogOut, Database } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function UserMenu() {
  // Check if we're in development mode
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  // Use mock data in development mode
  const mockUser = {
    imageUrl: '',
    fullName: 'Test User',
    firstName: 'Test',
    lastName: 'User',
    primaryEmailAddress: 'test@example.com'
  };
  
  // Only use Clerk in production
  const { signOut } = isDevelopment ? { signOut: () => {} } : useAuth();
  const { user } = isDevelopment ? { user: mockUser } : useUser();
  const navigate = useNavigate();

  const handleSignOut = () => {
    if (isDevelopment) {
      navigate('/');
    } else {
      signOut(() => {
        navigate('/');
      });
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "U";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.imageUrl} alt={user?.fullName || "User"} />
            <AvatarFallback>
              {getInitials(user?.firstName, user?.lastName)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            {user?.fullName && (
              <p className="font-medium">{user.fullName}</p>
            )}
            {user?.primaryEmailAddress && (
              <p className="w-[200px] truncate text-sm text-muted-foreground">
                {user.primaryEmailAddress.emailAddress}
              </p>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/backup')}>
          <Database className="mr-2 h-4 w-4" />
          <span>Backup & Restore</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => window.open('/user-profile', '_blank')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
