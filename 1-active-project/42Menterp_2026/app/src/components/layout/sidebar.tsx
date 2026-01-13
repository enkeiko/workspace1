"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Store,
  Radio,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Users,
  Wallet,
  TrendingUp,
  ClipboardList,
  Building2,
  Receipt,
  FileSignature,
  ShoppingCart,
  FileCheck,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const menuItems = [
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
    title: "채널 관리",
    subtitle: "Channels",
    href: "/channels",
    icon: Radio,
  },
  {
    title: "견적 관리",
    subtitle: "Quotation",
    href: "/quotations",
    icon: FileSignature,
  },
  {
    title: "수주 관리",
    subtitle: "Sales Order",
    href: "/sales-orders",
    icon: ShoppingCart,
  },
  {
    title: "발주 관리",
    subtitle: "Purchase Order",
    href: "/purchase-orders",
    icon: FileText,
  },
  {
    title: "거래명세서",
    subtitle: "Statement",
    href: "/statements",
    icon: FileCheck,
  },
  {
    title: "정산 관리",
    subtitle: "Settlement",
    href: "/settlements",
    icon: Wallet,
  },
  {
    title: "세금계산서",
    subtitle: "Tax Invoice",
    href: "/tax-invoices",
    icon: Receipt,
  },
  {
    title: "키워드 순위",
    subtitle: "Keywords",
    href: "/keywords",
    icon: TrendingUp,
  },
  {
    title: "작업 로그",
    subtitle: "Work Log",
    href: "/work-logs",
    icon: ClipboardList,
  },
  {
    title: "파트너사",
    subtitle: "Partners",
    href: "/tenants",
    icon: Building2,
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
