import { Suspense } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { quotationService } from "@/lib/services/quotation.service";
import { QuotationsTable } from "@/components/quotations/quotations-table";
import { TableSkeleton } from "@/components/shared/table-skeleton";

interface QuotationsPageProps {
  searchParams: {
    page?: string;
    search?: string;
    status?: string;
  };
}

async function getQuotationsData(page: number, search?: string, status?: string) {
  try {
    const result = await quotationService.getQuotations({
      page,
      limit: 20,
      search,
      status: status && status !== "all" ? status : undefined,
    });
    // Prisma의 Date와 null을 변환
    const quotations = result.quotations.map((quotation) => ({
      ...quotation,
      quotationDate: quotation.quotationDate.toISOString(),
      validUntil: quotation.validUntil?.toISOString(),
      createdAt: quotation.createdAt.toISOString(),
      totalAmount: Number(quotation.totalAmount),
    }));
    return {
      quotations,
      pagination: result.pagination,
    };
  } catch (error) {
    console.error("견적서 목록 조회 실패:", error);
    return {
      quotations: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
      },
    };
  }
}

export default async function QuotationsPage({ searchParams }: QuotationsPageProps) {
  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const search = searchParams.search;
  const status = searchParams.status || "all";

  const { quotations, pagination } = await getQuotationsData(page, search, status);

  return (
    <MainLayout>
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">견적서 관리</h1>
            <p className="text-gray-500">견적서를 관리합니다.</p>
          </div>
          <Link href="/quotations/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              견적서 추가
            </Button>
          </Link>
        </div>

        <Suspense fallback={<TableSkeleton rows={5} columns={8} />}>
          <QuotationsTable
            initialQuotations={quotations}
            initialTotalPages={pagination.totalPages}
            initialPage={page}
          />
        </Suspense>
      </div>
    </MainLayout>
  );
}
