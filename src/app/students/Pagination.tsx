"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  searchQuery?: string;
  classId?: string;
}

export function Pagination({ page, pageSize, totalPages, totalCount, searchQuery, classId }: PaginationProps) {
  const router = useRouter();

  function buildPageUrl(newPage: number, newPageSize?: number): string {
    const ps = new URLSearchParams();
    if (searchQuery) ps.set("q", searchQuery);
    if (classId) ps.set("classId", classId);
    ps.set("page", String(newPage));
    ps.set("pageSize", String(newPageSize || pageSize));
    return `/students?${ps.toString()}`;
  }

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(e.target.value);
    router.push(buildPageUrl(1, newSize));
  };

  return (
    <div className="mt-4 flex items-center justify-between rounded border border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">每页</span>
        <select
          className="rounded border border-slate-200 px-2 py-1 text-sm"
          value={pageSize}
          onChange={handlePageSizeChange}
        >
          <option value={20}>20 条</option>
          <option value={50}>50 条</option>
          <option value={100}>100 条</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.push(buildPageUrl(Math.max(1, page - 1)))}
          disabled={page <= 1}
          className={`inline-flex h-8 w-8 items-center justify-center rounded border ${
            page <= 1
              ? "pointer-events-none border-slate-100 text-slate-300"
              : "border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm text-slate-600">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => router.push(buildPageUrl(Math.min(totalPages, page + 1)))}
          disabled={page >= totalPages}
          className={`inline-flex h-8 w-8 items-center justify-center rounded border ${
            page >= totalPages
              ? "pointer-events-none border-slate-100 text-slate-300"
              : "border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
