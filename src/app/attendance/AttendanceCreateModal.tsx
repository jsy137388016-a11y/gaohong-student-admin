"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { StudentSearchSelect } from "@/components/StudentSearchSelect";
import { Field, inputClass, textareaClass } from "@/components/ui";
import { attendanceLabels } from "@/lib/format";
import { createAttendance } from "./actions";

type Student = { id: number; name: string; phone?: string | null; classRoom?: { name: string } | null };

export function AttendanceCreateModal({ students, userName }: { students: Student[]; userName: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleClose() {
    if (!isPending) {
      setOpen(false);
      setError("");
    }
  }

  function handleSubmit(formData: FormData) {
    setError("");
    startTransition(async () => {
      const result = await createAttendance(formData);
      if (result.success) {
        setOpen(false);
        window.location.reload();
      } else {
        setError(result.error || "新增失败");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
      >
        <Plus size={16} />
        新增考勤
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={handleClose}>
          <div
            className="mx-4 w-full max-w-lg rounded-lg bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">新增考勤</h3>
              <button type="button" onClick={handleClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form action={handleSubmit} className="max-h-[70vh] overflow-y-auto p-5">
              <div className="grid gap-4">
                <Field label="学生" required>
                  <StudentSearchSelect students={students} name="studentId" required />
                </Field>
                <Field label="日期" required>
                  <input type="date" name="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} disabled={isPending} />
                </Field>
                <Field label="类型" required>
                  <select name="type" required className={inputClass} disabled={isPending}>
                    {Object.entries(attendanceLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="时间段">
                  <select name="period" className={inputClass} disabled={isPending}>
                    <option value="">不指定</option>
                    <option value="早读">早读</option>
                    <option value="上午">上午</option>
                    <option value="下午">下午</option>
                    <option value="晚自习">晚自习</option>
                    <option value="宿舍归寝">宿舍归寝</option>
                  </select>
                </Field>
                <Field label="记录人" required>
                  <input name="recorder" required defaultValue={userName} className={inputClass} disabled={isPending} />
                </Field>
                <Field label="说明">
                  <textarea name="description" className={textareaClass} disabled={isPending} />
                </Field>
              </div>

              {error && (
                <div className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
              )}

              <div className="mt-5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex h-10 items-center gap-2 rounded bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  <Plus size={16} />
                  {isPending ? "提交中..." : "新增考勤"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
