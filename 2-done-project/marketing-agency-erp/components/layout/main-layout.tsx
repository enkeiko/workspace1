"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Store,
  Package,
  ShoppingCart,
  FileText,
  Calendar,
  Clock,
  FolderOpen,
  Settings,
} from "lucide-react";

interface MainLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: "대시보드", href: "/", icon: LayoutDashboard },
  { name: "고객 관리", href: "/customers", icon: Users },
  { name: "매장 관리", href: "/stores", icon: Store },
  { name: "상품 관리", href: "/products", icon: Package },
  { name: "주문 관리", href: "/orders", icon: ShoppingCart },
  { name: "견적서", href: "/quotations", icon: FileText },
  { name: "정산", href: "/settlements", icon: LayoutDashboard },
  { name: "상담", href: "/consultations", icon: Calendar },
  { name: "작업", href: "/tasks", icon: Clock },
  { name: "문서", href: "/documents", icon: FolderOpen },
];

export function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* 사이드바 */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-6">
            <h1 className="text-xl font-bold text-gray-900">마케팅 대행사</h1>
            <p className="text-sm text-gray-500 mt-1">성과 관리 시스템</p>
          </div>
          <nav className="px-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-gray-700 hover:bg-gray-100"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* 메인 컨텐츠 */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

