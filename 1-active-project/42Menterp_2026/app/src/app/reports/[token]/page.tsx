import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ClientReportView } from "./client-report-view";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function PublicReportPage({ params }: Props) {
  const { token } = await params;

  // 리포트 조회
  const report = await prisma.clientReport.findUnique({
    where: { secretToken: token },
    include: {
      salesOrder: {
        include: {
          customer: true,
          items: {
            include: {
              store: {
                include: {
                  keywords: {
                    where: { isActive: true },
                    include: {
                      rankings: {
                        orderBy: { checkDate: "desc" },
                        take: 30,
                      },
                    },
                  },
                },
              },
              product: true,
            },
          },
          purchaseOrders: {
            include: {
              items: {
                include: {
                  store: {
                    include: {
                      keywords: {
                        where: { isActive: true },
                        include: {
                          rankings: {
                            orderBy: { checkDate: "desc" },
                            take: 30,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!report) {
    notFound();
  }

  // 만료 체크
  if (report.expiresAt && new Date() > report.expiresAt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            리포트가 만료되었습니다
          </h1>
          <p className="text-gray-600">
            이 링크는 더 이상 유효하지 않습니다.
          </p>
        </div>
      </div>
    );
  }

  // 조회수 증가 (비동기)
  prisma.clientReport.update({
    where: { id: report.id },
    data: {
      viewCount: { increment: 1 },
      lastViewedAt: new Date(),
    },
  }).catch(console.error);

  // 데이터 가공
  const salesOrder = report.salesOrder;
  const purchaseItems = salesOrder.purchaseOrders.flatMap((po) => po.items);

  // 키워드별 성과 집계
  const keywordStats = new Map<
    string,
    {
      keyword: string;
      storeName: string;
      targetRank: number | null;
      currentRank: number | null;
      rankings: Array<{ date: string; rank: number | null }>;
      status: string;
      proofUrl: string | null;
      thumbnailUrl: string | null;
      completedDays: number;
      totalDays: number;
    }
  >();

  for (const item of purchaseItems) {
    const storeKeyword = item.store.keywords?.find(
      (k) => k.keyword.toLowerCase() === item.keyword.toLowerCase()
    );

    const rankings = storeKeyword?.rankings?.map((r) => ({
      date: r.checkDate.toISOString().split("T")[0],
      rank: r.ranking,
    })) || [];

    const currentRank = rankings[0]?.rank || null;

    keywordStats.set(`${item.storeId}-${item.keyword}`, {
      keyword: item.keyword,
      storeName: item.store.name,
      targetRank: item.targetRank,
      currentRank,
      rankings,
      status: item.status,
      proofUrl: item.proofUrl,
      thumbnailUrl: item.thumbnailUrl,
      completedDays: item.successDays,
      totalDays: item.workDays,
    });
  }

  // 요약 통계
  const totalKeywords = keywordStats.size;
  const completedCount = Array.from(keywordStats.values()).filter(
    (k) => k.status === "COMPLETED"
  ).length;
  const completionRate = totalKeywords > 0 ? (completedCount / totalKeywords) * 100 : 0;
  const avgRank =
    Array.from(keywordStats.values())
      .filter((k) => k.currentRank !== null)
      .reduce((sum, k) => sum + (k.currentRank || 0), 0) /
    (Array.from(keywordStats.values()).filter((k) => k.currentRank !== null).length || 1);

  const reportData = {
    title: report.title,
    description: report.description,
    showPricing: report.showPricing,
    customerName: salesOrder.customer?.name || "",
    salesOrderNo: salesOrder.salesOrderNo,
    summary: {
      totalKeywords,
      completedCount,
      completionRate: Math.round(completionRate),
      avgRank: Math.round(avgRank * 10) / 10,
    },
    keywords: Array.from(keywordStats.values()),
    totalAmount: report.showPricing ? salesOrder.totalAmount : null,
  };

  return <ClientReportView data={reportData} token={token} />;
}
