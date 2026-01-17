"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Search,
  FileText,
  ShoppingCart,
  Truck,
  CreditCard,
  Store,
  Package,
  Users,
  Settings,
  BarChart2,
  Plus,
  Loader2,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  href: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  campaign: <ShoppingCart className="h-4 w-4" />,
  store: <Store className="h-4 w-4" />,
  keyword: <Search className="h-4 w-4" />,
  order: <FileText className="h-4 w-4" />,
  product: <Package className="h-4 w-4" />,
  customer: <Users className="h-4 w-4" />,
  settlement: <CreditCard className="h-4 w-4" />,
  purchaseOrder: <Truck className="h-4 w-4" />,
};

const quickActions = [
  { id: "new-quotation", label: "새 견적서", href: "/quotations/new", icon: <Plus className="h-4 w-4" /> },
  { id: "new-order", label: "새 수주", href: "/orders/new", icon: <Plus className="h-4 w-4" /> },
  { id: "purchase-orders", label: "발주 관리", href: "/purchase-orders", icon: <Truck className="h-4 w-4" /> },
  { id: "settlements", label: "정산 관리", href: "/settlements", icon: <CreditCard className="h-4 w-4" /> },
  { id: "workflow", label: "워크플로우", href: "/workflow", icon: <BarChart2 className="h-4 w-4" /> },
  { id: "stores", label: "매장 관리", href: "/stores", icon: <Store className="h-4 w-4" /> },
  { id: "products", label: "상품 관리", href: "/products", icon: <Package className="h-4 w-4" /> },
  { id: "customers", label: "고객 관리", href: "/customers", icon: <Users className="h-4 w-4" /> },
  { id: "settings", label: "설정", href: "/settings", icon: <Settings className="h-4 w-4" /> },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [results, setResults] = React.useState<SearchResult[]>([]);

  // 검색 쿼리 디바운싱
  React.useEffect(() => {
    if (!search || search.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search/universal?q=${encodeURIComponent(search)}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // 다이얼로그 닫힐 때 초기화
  React.useEffect(() => {
    if (!open) {
      setSearch("");
      setResults([]);
    }
  }, [open]);

  const handleSelect = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-lg max-w-[640px]">
        <Command
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-4 [&_[cmdk-item]_svg]:w-4"
          shouldFilter={false}
        >
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              placeholder="검색어를 입력하세요... (캠페인, 매장, 키워드, 주문)"
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              value={search}
              onValueChange={setSearch}
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin opacity-50" />}
          </div>
          <Command.List className="max-h-[400px] overflow-y-auto overflow-x-hidden">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              {search.length < 2
                ? "2글자 이상 입력해주세요"
                : loading
                  ? "검색 중..."
                  : "검색 결과가 없습니다"}
            </Command.Empty>

            {/* 검색 결과 */}
            {results.length > 0 && (
              <Command.Group heading="검색 결과">
                {results.map((result) => (
                  <Command.Item
                    key={`${result.type}-${result.id}`}
                    value={`${result.type}-${result.id}`}
                    onSelect={() => handleSelect(result.href)}
                    className="flex items-center gap-2 cursor-pointer hover:bg-accent rounded-md"
                  >
                    {typeIcons[result.type] || <Search className="h-4 w-4" />}
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <span className="truncate">{result.title}</span>
                      {result.subtitle && (
                        <span className="text-xs text-muted-foreground truncate">
                          {result.subtitle}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">
                      {result.type}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* 빠른 액션 (검색어가 없을 때만 표시) */}
            {!search && (
              <Command.Group heading="빠른 액션">
                {quickActions.map((action) => (
                  <Command.Item
                    key={action.id}
                    value={action.id}
                    onSelect={() => handleSelect(action.href)}
                    className="flex items-center gap-2 cursor-pointer hover:bg-accent rounded-md"
                  >
                    {action.icon}
                    <span>{action.label}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <div className="flex gap-2">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd>
              <span>이동</span>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Enter</kbd>
              <span>선택</span>
            </div>
            <div>
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd>
              <span className="ml-1">닫기</span>
            </div>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

// 전역 키보드 단축키 훅
export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return { open, setOpen };
}

// Provider 컴포넌트
export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const { open, setOpen } = useCommandPalette();

  return (
    <>
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}
