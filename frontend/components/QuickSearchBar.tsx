import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";

interface QuickSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export default function QuickSearchBar({ 
  value, 
  onChange, 
  onClear, 
  placeholder = "Search transactions..." 
}: QuickSearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={`relative transition-all duration-200 ${isFocused ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
