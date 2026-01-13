"use client";

import { ReactNode } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterConfig } from "./types";

interface DataTableHeaderProps {
  // 검색
  searchable?: boolean;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;

  // 필터
  filters?: FilterConfig[];
  filterValues?: Record<string, string>;
  onFilter?: (filters: Record<string, string>) => void;

  // 헤더 액션
  headerActions?: ReactNode;
}

export function DataTableHeader({
  searchable = false,
  searchValue = "",
  searchPlaceholder = "검색...",
  onSearch,
  filters = [],
  filterValues = {},
  onFilter,
  headerActions,
}: DataTableHeaderProps) {
  const handleSearchChange = (value: string) => {
    onSearch?.(value);
  };

  const handleFilterChange = (filterId: string, value: string) => {
    const newFilters = { ...filterValues, [filterId]: value };
    if (value === "all") {
      delete newFilters[filterId];
    }
    onFilter?.(newFilters);
  };

  const handleClearSearch = () => {
    onSearch?.("");
  };

  const hasActiveFilters = Object.keys(filterValues).length > 0;

  const handleClearFilters = () => {
    onFilter?.({});
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        {/* 검색 */}
        {searchable && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchValue && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
                onClick={handleClearSearch}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}

        {/* 필터 */}
        {filters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <Select
                key={filter.id}
                value={filterValues[filter.id] || "all"}
                onValueChange={(value) => handleFilterChange(filter.id, value)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {filter.options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-9"
              >
                필터 초기화
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 헤더 액션 */}
      {headerActions && (
        <div className="flex items-center gap-2">{headerActions}</div>
      )}
    </div>
  );
}
