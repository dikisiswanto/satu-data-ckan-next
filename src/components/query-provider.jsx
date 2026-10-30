"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * One in-memory query cache per browser app session. Private portal data is
 * never persisted to localStorage/sessionStorage; a reload clears the cache.
 */
export function QueryProvider({ children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            retry: (failureCount, error) => {
              const status = Number(error?.status || 0);
              if ([400, 401, 403, 404, 409, 413, 422].includes(status)) {
                return false;
              }
              return failureCount < 1;
            },
            retryDelay: (failureCount, error) =>
              Number(error?.status) === 429 && error.retryAfterMs != null
                ? error.retryAfterMs
                : Math.min(1_000 * 2 ** failureCount, 10_000),
          },
          mutations: { retry: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
