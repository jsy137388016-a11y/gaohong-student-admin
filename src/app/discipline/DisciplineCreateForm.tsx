"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { StudentSearchSelect } from "@/components/StudentSearchSelect";
import { Field, inputClass, ModalShell, textareaClass } from "@/components/ui";
import { actionUrl } from "@/lib/action-utils";
import { createDiscipline } from "./actions";

export function DisciplineCreateForm({
  students,
  userName,
}: {
  students: { id: number; name: string; phone?: string | null; classRoom?: { name: string } | null }[];
  userName: string;
}) {
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
      const result = await createDiscipline(formData);
      if (result.success) {
        setOpen(false);
        window.location.href = actionUrl("/discipline", { notice: "违纪记录已新增" });
      } else {
        setError(result.error || "提交失败，请稍后重试");
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
        新增违纪
      </button>

      {open && (
        <ModalShell open={open} title="新增违纪记录" onClose={handleClose} maxWidth="max-w-xl">
            <form action={handleSubmit}>
              <div className="grid gap-4">
                <Field label="学生" required>
                  <StudentSearchSelect students={students} name="studentId" required />
                </Field>
                <Field label="违纪类型" required>
                  <input name="violationType" required placeholder="手机/迟到/寝室纪律" className={inputClass} disabled={isPending} />
                </Field>
                <Field label="违纪描述">
                  <textarea name="description" className={textareaClass} disabled={isPending} />
                </Field>
                <Field label="处理结果">
                  <textarea name="result" className={textareaClass} disabled={isPending} />
                </Field>
                <Field label="扣分">
                  <div>
                    <input type="number" name="deductScore" min="0" step="0.5" defaultValue="0" className={inputClass} disabled={isPending} />
                    <span className="mt-1 text-xs text-slate-500">德育基础分 20，每条违纪可扣分，0 表示不扣分</span>
                  </div>
                </Field>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="parentNotified" className="h-4 w-4 rounded border-slate-300 text-brand-600" disabled={isPending} />
                  已通知家长
                </label>
                <Field label="跟进人">
                  <input name="follower" defaultValue={userName} className={inputClass} disabled={isPending} />
                </Field>
                <Field label="备注">
                  <textarea name="remark" className={textareaClass} disabled={isPending} />
                </Field>
                <Field label="记录时间" required>
                  <input type="datetime-local" name="recordedAt" required defaultValue={new Date().toISOString().slice(0, 16)} className={inputClass} disabled={isPending} />
                </Field>
              </div>

              {error && (
                <div className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
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
                  {isPending ? "提交中..." : "新增记录"}
                </button>
              </div>
            </form>
        </ModalShell>
      )}
    </>
  );
}
