"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";
import { createGuaranteeLetter } from "./guarantee-letter-actions";

const initialState = { success: false, message: "" };

export function GuaranteeLetterForm({ studentId }: { studentId: number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(
    (prev: typeof initialState, formData: FormData) =>
      createGuaranteeLetter(studentId, formData),
    initialState
  );

  return (
    <div className="mb-4">
      {/* 切换按钮 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 items-center gap-1.5 rounded border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        {open ? <X size={14} /> : <Plus size={14} />}
        {open ? "取消" : "新增保证书"}
      </button>

      {/* 反馈信息 */}
      {state.message && (
        <div
          className={`mt-2 rounded px-3 py-2 text-sm ${
            state.success
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </div>
      )}

      {/* 表单 */}
      {open && (
        <form action={formAction} className="mt-4 rounded border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* 文件名称 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                文件名称 <span className="text-red-500">*</span>
              </label>
              <input
                name="fileName"
                required
                placeholder="如：2024年保证书.pdf"
                className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* 文件类型 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                文件类型
              </label>
              <input
                name="fileType"
                placeholder="如：PDF、IMG"
                className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* 文件大小 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                文件大小（字节）
              </label>
              <input
                name="fileSize"
                type="number"
                min="0"
                placeholder="如：204800"
                className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* 上传人 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                上传人 <span className="text-red-500">*</span>
              </label>
              <input
                name="uploadedBy"
                required
                placeholder="上传人姓名"
                className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* 文件地址 */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                文件地址（URL）
              </label>
              <input
                name="fileUrl"
                type="url"
                placeholder="https://..."
                className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* 备注 */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                备注
              </label>
              <textarea
                name="remark"
                rows={2}
                placeholder="其他补充说明"
                className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="h-8 rounded bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
            >
              提交保证书记录
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
