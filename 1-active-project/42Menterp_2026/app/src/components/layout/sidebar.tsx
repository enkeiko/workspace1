"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Store,
  Package,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Users,
  Wallet,
  ShoppingCart,
  UsersRound,
  List,
  Grid3X3,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface SubMenuItem {
  title: string;
  href: string;
  icon?: typeof List;
}

interface MenuItem {
  title: string;
  subtitle: string;
  href: string;
  icon: typeof LayoutDashboard;
  subItems?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  {
    title: "대시보드",
    subtitle: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "고객 관리",
    subtitle: "Customers",
    href: "/customers",
    icon: Users,
  },
  {
    title: "매장 관리",
    subtitle: "Stores",
    href: "/stores",
    icon: Store,
  },
  {
    title: "상품 관리",
    subtitle: "Products",
    href: "/products",
    icon: Package,
  },
  {
    title: "주문 관리",
    subtitle: "Orders",
    href: "/orders",
    icon: ShoppingCart,
  },
  {
    title: "발주 관리",
    subtitle: "Purchase Orders",
    href: "/purchase-orders",
    icon: FileText,
    subItems: [
      { title: "발주 목록", href: "/purchase-orders", icon: List },
      { title: "일괄발주", href: "/purchase-orders/bulk", icon: Grid3X3 },
    ],
  },
  {
    title: "정산 관리",
    subtitle: "Settlements",
    href: "/settlements",
    icon: Wallet,
  },
  {
    title: "계정 관리",
    subtitle: "Accounts",
    href: "/accounts",
    icon: UsersRound,
  },
  {
    title: "설정",
    subtitle: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);

  // 현재 경로가 하위메뉴에 해당하면 자동 확장
  useEffect(() => {
    menuItems.forEach((item) => {
      if (item.subItems && pathname.startsWith(item.href)) {
        setExpandedMenus((prev) =>
          prev.includes(item.href) ? prev : [...prev, item.href]
        );
      }
    });
  }, [pathname]);

  const toggleMenu = (href: string) => {
    setExpandedMenus((prev) =>
      prev.includes(href)
        ? prev.filter((h) => h !== href)
        : [...prev, href]
    );
  };

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-slate-900 text-white transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700">
        {!collapsed && (
          <Link href="/dashboard" className="text-xl font-bold">
            42ment ERP
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-white hover:bg-slate-800"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isExpanded = expandedMenus.includes(item.href);

          // 하위메뉴가 있는 경우
          if (hasSubItems) {
            return (
              <div key={item.href}>
                <button
                  onClick={() => toggleMenu(item.href)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full",
                    isActive
                      ? "bg-blue-600/50 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <item.icon size={20} className="flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <div className="flex items-baseline gap-1.5 min-w-0 flex-1">
                        <span className="truncate">{item.title}</span>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">
                          {item.subtitle}
                        </span>
                      </div>
                      <ChevronDown
                        size={16}
                        className={cn(
                          "transition-transform flex-shrink-0",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </>
                  )}
                </button>
                {/* 하위메뉴 */}
                {!collapsed && isExpanded && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-slate-700 pl-3">
                    {item.subItems!.map((subItem) => {
                      const isSubActive = pathname === subItem.href;
                      return (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm",
                            isSubActive
                              ? "bg-blue-600 text-white"
                              : "text-slate-400 hover:bg-slate-800 hover:text-white"
                          )}
                        >
                          {subItem.icon && <subItem.icon size={16} />}
                          <span>{subItem.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // 하위메뉴가 없는 일반 메뉴
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon size={20} className="flex-shrink-0" />
              {!collapsed && (
                <div className="flex items-baseline gap-1.5 min-w-0">
                  <span className="truncate">{item.title}</span>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">{item.subtitle}</span>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-700">
          <p className="text-xs text-slate-400">
            42ment Marketing ERP v1.0
          </p>
        </div>
      )}
    </aside>
  );
}
