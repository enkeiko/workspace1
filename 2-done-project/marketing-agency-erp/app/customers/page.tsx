import { Suspense } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { customerService } from "@/lib/services/customer.service";
import { CustomersTable } from "@/components/customers/customers-table";
import { TableSkeleton } from "@/components/shared/table-skeleton";

interface CustomersPageProps {
  searchParams: {
    page?: string;
    search?: string;
  };
}

async function getCustomersData(page: number, search?: string) {
  try {
    const result = await customerService.getCustomers({
      page,
      limit: 20,
      search,
    });
    // Prisma의 null을 undefined로 변환
    const customers = result.customers.map((customer) => ({
      ...customer,
      businessNumber: customer.businessNumber ?? undefined,
      contactPerson: customer.contactPerson ?? undefined,
      email: customer.email ?? undefined,
      phone: customer.phone ?? undefined,
      address: customer.address ?? undefined,
      createdAt: customer.createdAt.toISOString(),
    }));
    return {
      customers,
      pagination: result.pagination,
    };
  } catch (error) {
    console.error("고객 목록 조회 실패:", error);
    return {
      customers: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
      },
    };
  }
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const search = searchParams.search;

  const { customers, pagination } = await getCustomersData(page, search);

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">고객 관리</h1>
            <p className="text-gray-500">고객 정보를 관리합니다.</p>
          </div>
          <Link href="/customers/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              고객 추가
            </Button>
          </Link>
        </div>

        <Suspense fallback={<TableSkeleton rows={5} columns={6} />}>
          <CustomersTable
            initialCustomers={customers}
            initialTotalPages={pagination.totalPages}
            initialPage={page}
          />
        </Suspense>
      </div>
    </MainLayout>
  );
}
