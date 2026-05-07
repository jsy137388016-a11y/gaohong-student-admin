"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { AddButton, Field, inputClass, ModalShell, textareaClass } from "@/components/ui";
import { createExam } from "./actions";

export function ExamCreateModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
      >
        <Plus size={16} />
        新增考试
      </button>
      <ModalShell open={open} title="新增考试" onClose={() => setOpen(false)} maxWidth="max-w-xl">
        <form action={createExam} className="grid gap-4">
          <Field label="考试名称" required>
            <input name="name" required placeholder="三月月考" className={inputClass} />
          </Field>
          <Field label="考试日期" required>
            <input type="date" name="examDate" required className={inputClass} />
          </Field>
          <Field label="年级" required>
            <input name="grade" required placeholder="高三" className={inputClass} />
          </Field>
          <Field label="考试类型" required>
            <select name="type" required className={inputClass}>
              <option value="月考">月考</option>
              <option value="模拟考">模拟考</option>
              <option value="周测">周测</option>
              <option value="限时训练">限时训练</option>
              <option value="日常测验">日常测验</option>
            </select>
          </Field>
          <Field label="备注">
            <textarea name="remark" className={textareaClass} />
          </Field>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              取消
            </button>
            <AddButton>新增考试</AddButton>
          </div>
        </form>
      </ModalShell>
    </>
  );
}
