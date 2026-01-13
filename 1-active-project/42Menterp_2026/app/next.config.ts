import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // 채널 관리 → 상품 관리
      {
        source: "/channels",
        destination: "/products",
        permanent: true,
      },
      {
        source: "/channels/:id",
        destination: "/products/:id",
        permanent: true,
      },
      // 견적 관리 → 주문 관리 (견적 탭)
      {
        source: "/quotations",
        destination: "/orders?tab=quotations",
        permanent: true,
      },
      {
        source: "/quotations/:id",
        destination: "/orders/quotations/:id",
        permanent: false,
      },
      // 수주 관리 → 주문 관리 (수주 탭)
      {
        source: "/sales-orders",
        destination: "/orders?tab=sales-orders",
        permanent: true,
      },
      // 거래명세서 → 주문 관리 (거래명세서 탭)
      {
        source: "/statements",
        destination: "/orders?tab=statements",
        permanent: true,
      },
      // 세금계산서 → 정산 관리 (세금계산서 탭)
      {
        source: "/tax-invoices",
        destination: "/settlements?tab=tax-invoices",
        permanent: true,
      },
      // 파트너사 → 계정 관리 (파트너사 탭)
      {
        source: "/tenants",
        destination: "/accounts?tab=partners",
        permanent: true,
      },
      {
        source: "/tenants/:id",
        destination: "/accounts/tenants/:id",
        permanent: false,
      },
      // 키워드 순위 → 매장 관리 (안내)
      {
        source: "/keywords",
        destination: "/stores",
        permanent: true,
      },
      // 작업 로그 → 매장 관리 (안내)
      {
        source: "/work-logs",
        destination: "/stores",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
