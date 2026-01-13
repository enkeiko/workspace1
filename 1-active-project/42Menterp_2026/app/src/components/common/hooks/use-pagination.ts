"use client";

import { useState, useCallback, useMemo } from "react";

interface UsePaginationOptions {
  initialPage?: number;
  initialLimit?: number;
  total?: number;
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UsePaginationReturn {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setTotal: (total: number) => void;
  setPagination: (state: Partial<PaginationState>) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  offset: number;
  pagination: PaginationState;
}

export function usePagination(
  options: UsePaginationOptions = {}
): UsePaginationReturn {
  const { initialPage = 1, initialLimit = 20, total: initialTotal = 0 } = options;

  const [page, setPageState] = useState(initialPage);
  const [limit, setLimitState] = useState(initialLimit);
  const [total, setTotalState] = useState(initialTotal);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit]
  );

  const setPage = useCallback(
    (newPage: number) => {
      const validPage = Math.max(1, Math.min(newPage, totalPages));
      setPageState(validPage);
    },
    [totalPages]
  );

  const setLimit = useCallback((newLimit: number) => {
    setLimitState(Math.max(1, newLimit));
    setPageState(1); // 페이지 리셋
  }, []);

  const setTotal = useCallback((newTotal: number) => {
    setTotalState(Math.max(0, newTotal));
  }, []);

  const setPagination = useCallback((state: Partial<PaginationState>) => {
    if (state.page !== undefined) setPageState(state.page);
    if (state.limit !== undefined) setLimitState(state.limit);
    if (state.total !== undefined) setTotalState(state.total);
  }, []);

  const nextPage = useCallback(() => {
    setPage(page + 1);
  }, [page, setPage]);

  const prevPage = useCallback(() => {
    setPage(page - 1);
  }, [page, setPage]);

  const goToPage = useCallback(
    (targetPage: number) => {
      setPage(targetPage);
    },
    [setPage]
  );

  const hasNextPage = useMemo(() => page < totalPages, [page, totalPages]);
  const hasPrevPage = useMemo(() => page > 1, [page]);

  const offset = useMemo(() => (page - 1) * limit, [page, limit]);

  const pagination = useMemo(
    () => ({
      page,
      limit,
      total,
      totalPages,
    }),
    [page, limit, total, totalPages]
  );

  return {
    page,
    limit,
    total,
    totalPages,
    setPage,
    setLimit,
    setTotal,
    setPagination,
    nextPage,
    prevPage,
    goToPage,
    hasNextPage,
    hasPrevPage,
    offset,
    pagination,
  };
}
