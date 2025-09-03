import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Receipt, 
  Target, 
  PiggyBank, 
  BarChart3,
  Wallet,
  Tags,
  Lightbulb,
  Calendar,
  Database,
  AlertCircle
} from "lucide-react";
import NotificationCenter from "./NotificationCenter";
import UserMenu from "./UserMenu";

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Transactions", href: "/transactions", icon: Receipt },
  { name: "Categories", href: "/categories", icon: Tags },
  { name: "Budgets", href: "/budgets", icon: PiggyBank },
  { name: "Bills", href: "/bills", icon: Calendar },
  { name: "Goals", href: "/goals", icon: Target },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Insights", href: "/insights", icon: Lightbulb },
  { name: "Backup", href: "/backup", icon: Database },
  { name: "Error Handling Demo", href: "/error-handling-demo", icon: AlertCircle },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
          <div className="p-6">
            <div className="flex items-center space-x-2">
              <Wallet className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">FinanceTracker</h1>
            </div>
          </div>
          
          <nav className="mt-6">
            <div className="px-3">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "group flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "mr-3 h-5 w-5 flex-shrink-0",
                        isActive ? "text-blue-500" : "text-gray-400 group-hover:text-gray-500"
                      )}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Main content */}
        <div className="flex-1">
          {/* Top navigation */}
          <div className="bg-white border-b border-gray-200 px-8 py-4">
            <div className="flex items-center justify-end">
              <div className="flex items-center space-x-4">
                <NotificationCenter />
                <UserMenu />
              </div>
            </div>
          </div>

          <main className="p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
