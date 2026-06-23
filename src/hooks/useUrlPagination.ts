"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export type UrlPaginationOptions = {
  param?: string;
  defaultLimit?: number;
};

export function useUrlPagination(options?: UrlPaginationOptions) {
  const param = options?.param ?? "offset";
  const defaultLimit = options?.defaultLimit ?? 50;
  const searchParams = useSearchParams();
  const router = useRouter();

  const offset = Number(searchParams.get(param)) || 0;

  const queryParams = useMemo(
    () => ({ limit: defaultLimit, offset }),
    [defaultLimit, offset],
  );

  const handlePageChange = useCallback(
    (newOffset: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newOffset > 0) params.set(param, String(newOffset));
      else params.delete(param);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [param, router, searchParams],
  );

  return { offset, limit: defaultLimit, queryParams, handlePageChange, searchParams, router };
}
