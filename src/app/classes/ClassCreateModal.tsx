"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Field, inputClass, ModalShell, textareaClass } from "@/components/ui";
import { createClass } from "./actions";

export function ClassCreateModal() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function close() {
    if (!isPending) {
      setOpen(false);
      setError("");
    }
  }

  function handleSubmit(formData: FormData) {
    setError("");
    startTransition(async () => {
      const result = await createClass(formData);
      if (result.success) {
        window.location.href = "/classes?notice=班级已新增";
        return;
      }
      setError(result.error || "创建班级失败");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
      >
        <Plus size={16} />
        新增班级
      </button>
      <ModalShell open={open} title="新增班级" onClose={close} maxWidth="max-w-xl">
        <form action={handleSubmit} className="grid gap-4">
          <Field label="班级名称" required>
            <input name="name" required placeholder="艺考冲刺1班" className={inputClass} disabled={isPending} />
          </Field>
          <Field label="年级" required>
            <input name="grade" required placeholder="高三" className={inputClass} disabled={isPending} />
          </Field>
          <Field label="班主任" required>
            <input name="headTeacher" required className={inputClass} disabled={isPending} />
          </Field>
          <Field label="备注">
            <textarea name="remark" className={textareaClass} disabled={isPending} />
          </Field>
          {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={close}
              disabled={isPending}
              className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              取消
            </button>
            <button
              disabled={isPending}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              <Plus size={16} />
              {isPending ? "提交中..." : "新增班级"}
            </button>
          </div>
        </form>
      </ModalShell>
    </>
  );
}
