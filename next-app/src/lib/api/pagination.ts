import { NextResponse } from "next/server";
import { paginationSchema } from "@/lib/validation/schemas";

export type Pagination = { page: number; pageSize: number; skip: number; take: number };

/**
 * Pagination is opt-in (`?page=`): mobile clients expect plain
 * arrays, so without a page parameter the full (bounded) collection is
 * returned and `X-Total-Count` carries the size.
 */
export function paginationFrom(searchParams: URLSearchParams): Pagination | null {
  if (!searchParams.has("page")) return null;
  const parsed = paginationSchema.parse({
    page: searchParams.get("page") ?? 1,
    page_size: searchParams.get("page_size") ?? 20,
  });
  return {
    page: parsed.page,
    pageSize: parsed.page_size,
    skip: (parsed.page - 1) * parsed.page_size,
    take: parsed.page_size,
  };
}

export function pageUrl(request: Request, page: number, pageSize: number): string {
  const url = new URL(request.url);
  url.searchParams.set("page", String(page));
  url.searchParams.set("page_size", String(pageSize));
  return url.toString();
}

export function paginatedResponse<T>(
  request: Request,
  items: T[],
  total: number,
  pagination: Pagination,
): NextResponse {
  const hasNext = pagination.page * pagination.pageSize < total;
  const hasPrevious = pagination.page > 1;
  return NextResponse.json(
    {
      count: total,
      next: hasNext ? pageUrl(request, pagination.page + 1, pagination.pageSize) : null,
      previous: hasPrevious
        ? pageUrl(request, pagination.page - 1, pagination.pageSize)
        : null,
      results: items,
    } as never,
    { headers: { "X-Total-Count": String(total) } },
  );
}

export function listResponse<T>(items: T[], total: number): NextResponse {
  return NextResponse.json(items as never, {
    headers: { "X-Total-Count": String(total) },
  });
}
