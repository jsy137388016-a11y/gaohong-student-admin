"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";
import { Field, inputClass, ModalShell, textareaClass } from "@/components/ui";
import { actionUrl } from "@/lib/action-utils";
import { createStudent } from "./actions";

type ClassItem = { id: number; grade: string; name: string };

export function StudentCreateModal({ classes }: { classes: ClassItem[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    if (!isPending) {
      setOpen(false);
      setError(null);
    }
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createStudent(formData);
      if (result?.success) {
        setOpen(false);
        window.location.href = actionUrl("/students", { notice: "学生已新增" });
      } else {
        setError(result?.error || "新增失败");
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
        新增学生
      </button>

      {open && (
        <ModalShell open={open} title="新增学生" onClose={handleClose} maxWidth="max-w-2xl">
            <form action={handleSubmit}>
              <div className="grid gap-4">
                <Field label="姓名" required>
                  <input name="name" required className={inputClass} disabled={isPending} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="性别" required>
                    <select name="gender" required className={inputClass} disabled={isPending}>
                      <option value="male">男</option>
                      <option value="female">女</option>
                    </select>
                  </Field>
                  <Field label="年级" required>
                    <input name="grade" required placeholder="高三" className={inputClass} disabled={isPending} />
                  </Field>
                </div>
                <Field label="班级">
                  <select name="classId" className={inputClass} disabled={isPending}>
                    <option value="">暂不分班</option>
                    {classes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.grade} {item.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="手机号">
                  <input name="phone" className={inputClass} disabled={isPending} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="家长姓名" required>
                    <input name="parentName" required className={inputClass} disabled={isPending} />
                  </Field>
                  <Field label="家长电话" required>
                    <input name="parentPhone" required className={inputClass} disabled={isPending} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="住宿状态" required>
                    <select name="boardingStatus" required className={inputClass} disabled={isPending}>
                      <option value="boarding">住宿</option>
                      <option value="day_student">走读</option>
                    </select>
                  </Field>
                  <Field label="艺考专业">
                    <input name="artMajor" placeholder="播音/美术/音乐" className={inputClass} disabled={isPending} />
                  </Field>
                </div>
                <Field label="备注">
                  <textarea name="remark" className={textareaClass} disabled={isPending} />
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
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  <Plus size={16} />
                  {isPending ? "提交中..." : "新增学生"}
                </button>
              </div>
            </form>
        </ModalShell>
      )}
    </>
  );
}
