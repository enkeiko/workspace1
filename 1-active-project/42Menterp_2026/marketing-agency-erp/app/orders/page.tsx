import { Suspense } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { orderService } from "@/lib/services/order.service";
import { OrdersTable } from "@/components/orders/orders-table";
import { TableSkeleton } from "@/components/shared/table-skeleton";

interface OrdersPageProps {
  searchParams: {
    page?: string;
    search?: string;
    status?: string;
  };
}

async function getOrdersData(page: number, search?: string, status?: string) {
  try {
    const result = await orderService.getOrders({
      page,
      limit: 20,
      search,
      status: status && status !== "all" ? status : undefined,
    });
    // Prisma의 Date와 null을 변환
    const orders = result.orders.map((order) => ({
      ...order,
      orderDate: order.orderDate.toISOString(),
      dueDate: order.dueDate?.toISOString(),
      createdAt: order.createdAt.toISOString(),
      totalAmount: Number(order.totalAmount),
      paidAmount: Number(order.paidAmount),
      unpaidAmount: Number(order.unpaidAmount),
      store: order.store ? { id: order.store.id, name: order.store.name } : null,
      quotation: order.quotation
        ? { id: order.quotation.id, quotationNumber: order.quotation.quotationNumber }
        : null,
    }));
    return {
      orders,
      pagination: result.pagination,
    };
  } catch (error) {
    console.error("주문 목록 조회 실패:", error);
    return {
      orders: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
      },
    };
  }
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const search = searchParams.search;
  const status = searchParams.status || "all";

  const { orders, pagination } = await getOrdersData(page, search, status);

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">주문 관리</h1>
            <p className="text-gray-500">주문을 관리합니다.</p>
          </div>
          <Link href="/orders/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              주문 추가
            </Button>
          </Link>
        </div>

        <Suspense fallback={<TableSkeleton rows={5} columns={9} />}>
          <OrdersTable
            initialOrders={orders}
            initialTotalPages={pagination.totalPages}
            initialPage={page}
          />
        </Suspense>
      </div>
    </MainLayout>
  );
}
