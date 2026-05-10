"use client";

import { useTransition } from "react";
import { PowerOff } from "lucide-react";

export function DeactivateClassButton({
  classId,
  className,
  studentCount,
  action
}: {
  classId: number;
  className: string;
  studentCount: number;
  action: (id: number) => Promise<{ success: boolean; error?: string }>;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const studentMsg =
      studentCount > 0
        ? `\n\n该班级下有 ${studentCount} 名学生，停用后将自动转入"暂不分班"，历史记录保留。`
        : "";
    const confirmed = window.confirm(
      `确定要停用班级「${className}」吗？${studentMsg}\n\n停用后班级不再显示，如需恢复请联系管理员。`
    );
    if (!confirmed) return;

    startTransition(async () => {
      const result = await action(classId);
      if (result.success) {
        window.location.href = "/classes?notice=班级已停用，学生已转入暂不分班";
        return;
      }
      alert(result.error || "停用失败");
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex h-8 w-8 items-center justify-center rounded border border-orange-200 text-orange-600 hover:bg-orange-50 disabled:opacity-50"
      title="停用班级"
    >
      <PowerOff size={15} />
    </button>
  );
}
