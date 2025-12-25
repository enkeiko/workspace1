"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1분간 캐시 유지
            gcTime: 5 * 60 * 1000, // 5분간 가비지 컬렉션 대기
            refetchOnWindowFocus: false, // 윈도우 포커스 시 자동 리페치 비활성화
            retry: 1, // 실패 시 1번만 재시도
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

