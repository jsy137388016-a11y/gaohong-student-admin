"use client";

import { useState, useTransition } from "react";
import { FileText } from "lucide-react";
import { deleteGuaranteeLetter } from "./guarantee-letter-actions";

interface Letter {
  id: number;
  fileName: string;
  fileType?: string | null;
  fileSize?: number | null;
  fileUrl?: string | null;
  remark?: string | null;
  uploadedBy?: string | null;
  createdAt: Date | string;
}

export function GuaranteeLetterItem({
  letter,
  studentId,
}: {
  letter: Letter;
  studentId: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function handleDelete() {
    setError("");
    if (!window.confirm("确认删除该保证书记录吗？")) return;
    startTransition(async () => {
      const result = await deleteGuaranteeLetter(letter.id, studentId);
      if (!result.success) setError(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-slate-200 bg-white p-4 text-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-slate-400" />
          <span className="font-medium text-slate-900">
            {letter.fileName || "未命名文件"}
          </span>
          {letter.fileType && (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {letter.fileType}
            </span>
          )}
          {letter.fileSize ? (
            <span className="text-xs text-slate-400">
              {Math.round(Number(letter.fileSize) / 1024)} KB
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {letter.fileUrl && (
            <a
              href={letter.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-7 items-center gap-1 rounded bg-brand-50 px-3 text-xs font-medium text-brand-700 hover:bg-brand-100"
            >
              查看文件
            </a>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="inline-flex h-7 items-center gap-1 rounded border border-red-200 px-2 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            {isPending ? "删除中..." : "删除"}
          </button>
        </div>
      </div>
      {error ? <div className="rounded bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div> : null}
      {letter.remark && <div className="text-slate-600">{letter.remark}</div>}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
        {letter.uploadedBy && <span>上传人：{letter.uploadedBy}</span>}
        <span>
          上传时间：
          {new Date(letter.createdAt).toLocaleDateString("zh-CN")}
        </span>
      </div>
    </div>
  );
}
