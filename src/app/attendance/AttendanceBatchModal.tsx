"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckSquare, Users } from "lucide-react";
import { Field, inputClass, ModalShell, textareaClass } from "@/components/ui";
import { attendanceLabels } from "@/lib/format";
import { actionUrl } from "@/lib/action-utils";
import { createBatchAttendance } from "./actions";

type ClassItem = { id: number; grade: string; name: string };
type Student = {
  id: number;
  name: string;
  phone?: string | null;
  classId?: number | null;
  classRoom?: { id?: number; name: string; grade?: string } | null;
};

export function AttendanceBatchModal({
  classes,
  students,
  userName,
  onlyLeave = false
}: {
  classes: ClassItem[];
  students: Student[];
  userName: string;
  onlyLeave?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [classId, setClassId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const visibleStudents = useMemo(() => {
    if (!classId) return [];
    return students.filter((student) => String(student.classId || student.classRoom?.id || "") === classId);
  }, [classId, students]);

  const availableAttendanceLabels = onlyLeave ? { leave: attendanceLabels.leave } : attendanceLabels;

  function close() {
    if (!isPending) {
      setOpen(false);
      setError("");
    }
  }

  function changeClass(nextClassId: string) {
    setClassId(nextClassId);
    const ids = students
      .filter((student) => String(student.classId || student.classRoom?.id || "") === nextClassId)
      .map((student) => student.id);
    setSelectedIds(new Set(ids));
  }

  function toggleStudent(id: number) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size === visibleStudents.length) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(visibleStudents.map((student) => student.id)));
  }

  function handleSubmit(formData: FormData) {
    setError("");
    for (const id of selectedIds) formData.append("studentIds", String(id));

    startTransition(async () => {
      const result = await createBatchAttendance(formData);
      if (result.success) {
        window.location.href = actionUrl("/attendance", { notice: `已批量录入${result.count || selectedIds.size}条考勤` });
        return;
      }
      setError(result.error || "批量录入失败");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-4 text-sm font-medium text-brand-700 hover:bg-brand-100"
      >
        <Users size={16} />
        {onlyLeave ? "班级批量请假" : "班级批量录入"}
      </button>
      <ModalShell open={open} title={onlyLeave ? "按班级批量请假" : "按班级批量录入考勤"} onClose={close} maxWidth="max-w-3xl">
        <form action={handleSubmit}>
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="班级" required>
              <select value={classId} onChange={(e) => changeClass(e.target.value)} className={inputClass} disabled={isPending}>
                <option value="">请选择班级</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.grade} {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="日期" required>
              <input type="date" name="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} disabled={isPending} />
            </Field>
            <Field label="考勤类型" required>
              <select name="type" required className={inputClass} disabled={isPending}>
                {Object.entries(availableAttendanceLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
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
              <textarea name="description" placeholder="可填写本次批量录入说明" className={textareaClass} disabled={isPending} />
            </Field>
          </div>

          <div className="mt-5 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-sm font-medium text-slate-700">
                学生名单
                {classId ? <span className="ml-2 text-xs text-slate-500">已选 {selectedIds.size} / {visibleStudents.length}</span> : null}
              </div>
              <button
                type="button"
                onClick={toggleAll}
                disabled={!visibleStudents.length || isPending}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <CheckSquare size={14} />
                {selectedIds.size === visibleStudents.length && visibleStudents.length > 0 ? "取消全选" : "全选"}
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto p-3">
              {!classId ? (
                <div className="py-8 text-center text-sm text-slate-500">请选择班级后录入考勤</div>
              ) : visibleStudents.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">该班级暂无在读学生</div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {visibleStudents.map((student) => (
                    <label key={student.id} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(student.id)}
                        onChange={() => toggleStudent(student.id)}
                        disabled={isPending}
                        className="h-4 w-4 rounded border-slate-300 text-brand-600"
                      />
                      <span className="font-medium text-slate-800">{student.name}</span>
                      <span className="text-xs text-slate-400">{student.phone || ""}</span>
                    </label>
                  ))}
                </div>
              )}
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
              disabled={isPending || selectedIds.size === 0}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              <CheckSquare size={16} />
              {isPending ? "录入中..." : onlyLeave ? "批量请假" : "批量录入"}
            </button>
          </div>
        </form>
      </ModalShell>
    </>
  );
}
