"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";
import { createDisciplineFromStudent } from "./discipline-actions";

const initialState = { success: false, message: "" };

export function DisciplineForm({ studentId }: { studentId: number }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(
    (prev: typeof initialState, formData: FormData) =>
      createDisciplineFromStudent(studentId, formData),
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
        {open ? "取消" : "新增违纪"}
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
            {/* 违纪类型 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                违纪类型 <span className="text-red-500">*</span>
              </label>
              <input
                name="violationType"
                required
                placeholder="如：上课玩手机"
                className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* 扣分 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                扣分
              </label>
              <input
                name="deductScore"
                type="number"
                min="0"
                defaultValue="0"
                placeholder="0"
                className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* 违纪时间 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                违纪时间 <span className="text-red-500">*</span>
              </label>
              <input
                name="recordedAt"
                type="date"
                required
                defaultValue={new Date().toISOString().split("T")[0]}
                className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* 跟进人 */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                跟进人
              </label>
              <input
                name="follower"
                placeholder="跟进人姓名"
                className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* 是否通知家长 */}
            <div className="flex items-center gap-2 md:col-span-2">
              <input
                name="parentNotified"
                id="parentNotified"
                type="checkbox"
                className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="parentNotified" className="text-sm text-slate-700">
                已通知家长
              </label>
            </div>

            {/* 违纪描述 */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                违纪描述
              </label>
              <textarea
                name="description"
                rows={2}
                placeholder="简要描述违纪情况"
                className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>

            {/* 处理结果 */}
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                处理结果
              </label>
              <input
                name="result"
                placeholder="如：口头警告、书面检讨"
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
              提交违纪记录
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
