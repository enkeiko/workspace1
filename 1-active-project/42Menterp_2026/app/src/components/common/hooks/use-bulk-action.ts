"use client";

import { useState, useCallback } from "react";

export interface BulkError {
  id: string;
  name?: string;
  reason: string;
}

export interface BulkResult {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  errors: BulkError[];
}

interface UseBulkActionOptions {
  resource: string;
  onSuccess?: () => void;
  onError?: (errors: BulkError[]) => void;
}

interface UseBulkActionReturn {
  update: (
    ids: string[],
    data: Record<string, unknown>
  ) => Promise<BulkResult>;
  remove: (ids: string[]) => Promise<BulkResult>;
  isLoading: boolean;
  error: Error | null;
}

export function useBulkAction(
  options: UseBulkActionOptions
): UseBulkActionReturn {
  const { resource, onSuccess, onError } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(
    async (
      ids: string[],
      data: Record<string, unknown>
    ): Promise<BulkResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/${resource}/bulk`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids, data }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "일괄 수정에 실패했습니다.");
        }

        const result: BulkResult = await response.json();

        if (result.errors.length > 0) {
          onError?.(result.errors);
        } else {
          onSuccess?.();
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("알 수 없는 오류");
        setError(error);
        return {
          success: false,
          total: ids.length,
          succeeded: 0,
          failed: ids.length,
          errors: ids.map((id) => ({ id, reason: error.message })),
        };
      } finally {
        setIsLoading(false);
      }
    },
    [resource, onSuccess, onError]
  );

  const remove = useCallback(
    async (ids: string[]): Promise<BulkResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/${resource}/bulk`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || "일괄 삭제에 실패했습니다.");
        }

        const result: BulkResult = await response.json();

        if (result.errors.length > 0) {
          onError?.(result.errors);
        } else {
          onSuccess?.();
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("알 수 없는 오류");
        setError(error);
        return {
          success: false,
          total: ids.length,
          succeeded: 0,
          failed: ids.length,
          errors: ids.map((id) => ({ id, reason: error.message })),
        };
      } finally {
        setIsLoading(false);
      }
    },
    [resource, onSuccess, onError]
  );

  return {
    update,
    remove,
    isLoading,
    error,
  };
}
