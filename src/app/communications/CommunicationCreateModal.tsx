"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Field, inputClass, ModalShell, textareaClass } from "@/components/ui";
import { methodLabels } from "@/lib/format";
import { createCommunication } from "./actions";

type Student = {
  id: number;
  name: string;
  classRoom?: { name: string } | null;
};

export function CommunicationCreateModal({ students, userName }: { students: Student[]; userName: string }) {
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
      const result = await createCommunication(formData);
      if (result.success) {
        window.location.href = "/communications?notice=沟通记录已新增";
        return;
      }
      setError(result.error || "新增沟通记录失败");
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
        新增沟通
      </button>
      <ModalShell open={open} title="新增沟通记录" onClose={close} maxWidth="max-w-2xl">
        <form action={handleSubmit}>
          <div className="grid gap-4">
            <Field label="学生" required>
              <select name="studentId" required className={inputClass} disabled={isPending}>
                <option value="">请选择学生</option>
                {students.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} {item.classRoom ? `(${item.classRoom.name})` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="沟通对象" required>
                <input name="target" required placeholder="父亲/母亲" className={inputClass} disabled={isPending} />
              </Field>
              <Field label="沟通方式" required>
                <select name="method" required className={inputClass} disabled={isPending}>
                  {Object.entries(methodLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="沟通内容" required>
              <textarea name="content" required className={textareaClass} disabled={isPending} />
            </Field>
            <Field label="家长反馈">
              <textarea name="parentFeedback" placeholder="家长的主要反馈" className={textareaClass} disabled={isPending} />
            </Field>
            <Field label="后续跟进事项">
              <textarea name="followUp" placeholder="需要班主任继续跟进的事项" className={textareaClass} disabled={isPending} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="沟通人" required>
                <input name="communicator" required defaultValue={userName} className={inputClass} disabled={isPending} />
              </Field>
              <Field label="沟通时间" required>
                <input
                  type="datetime-local"
                  name="contactedAt"
                  required
                  defaultValue={new Date().toISOString().slice(0, 16)}
                  className={inputClass}
                  disabled={isPending}
                />
              </Field>
            </div>
          </div>
          {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          <div className="mt-5 flex justify-end gap-3">
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
              {isPending ? "提交中..." : "新增沟通"}
            </button>
          </div>
        </form>
      </ModalShell>
    </>
  );
}
