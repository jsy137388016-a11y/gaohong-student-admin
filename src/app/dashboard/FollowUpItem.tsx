"use client";

import { useTransition, useState } from "react";
import { deleteCommunication } from "./actions";

type FollowUpItemProps = {
  id: number;
  studentId: number;
  studentName: string;
  target: string;
  followUp: string;
  contactedAt: string;
};

export function FollowUpItem({ id, studentId, studentName, target, followUp, contactedAt }: FollowUpItemProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleDelete() {
    setError(null);
    setDialogOpen(true);
  }

  function handleCancel() {
    setDialogOpen(false);
    setError(null);
  }

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteCommunication(id);
      if (result.success) {
        setDialogOpen(false);
        window.location.href = "/dashboard";
      } else {
        setError(result.error || "删除失败");
      }
    });
  }

  return (
    <>
      <div className="group rounded border border-slate-200 p-4 hover:border-brand-300 hover:bg-brand-50/30 transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <a
              href={`/students/${studentId}`}
              className="font-medium text-slate-950 hover:text-brand-700 hover:underline"
            >
              {studentName} · {target}
            </a>
            <div className="mt-1 text-sm text-slate-600">{followUp}</div>
            <div className="mt-1 text-xs text-slate-400">{contactedAt}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={`/students/${studentId}`}
              className="rounded px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors"
            >
              查看详情
            </a>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {isPending ? "删除中..." : "删除"}
            </button>
          </div>
        </div>
      </div>

      {/* 确认对话框 */}
      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={handleCancel}>
          <div className="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-900">确认删除</h3>
            <p className="mt-2 text-sm text-slate-600">
              确定要删除 <span className="font-medium text-slate-900">{studentName}</span> 的跟进事项吗？删除后无法恢复。
            </p>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "删除中..." : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
