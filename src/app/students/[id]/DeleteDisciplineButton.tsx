"use client";

import { useActionState } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { deleteStudentDiscipline } from "./discipline-actions";

type ActionResult = {
  success: boolean;
  message: string;
};

export function DeleteDisciplineButton({
  disciplineId,
  studentId,
}: {
  disciplineId: number;
  studentId: number;
}) {
  const [state, formAction, isPending] = useActionState(
    async (prevState: ActionResult) => {
      const result = await deleteStudentDiscipline(disciplineId, studentId);
      if (result.success) {
        // 成功后刷新页面（revalidatePath 已在 action 中调用）
        window.location.reload();
      }
      return result;
    },
    { success: false, message: "" }
  );

  return (
    <>
      {/* 删除按钮 */}
      <button
        type="button"
        onClick={() => {
          const modal = document.getElementById(`delete-discipline-modal-${disciplineId}`) as HTMLDialogElement;
          modal?.showModal();
        }}
        className="inline-flex h-7 items-center gap-1 rounded border border-red-200 bg-white px-2 text-xs font-medium text-red-600 hover:bg-red-50"
        title="删除违纪记录"
      >
        <Trash2 size={12} />
        删除
      </button>

      {/* 确认对话框 - 使用 native dialog */}
      <dialog id={`delete-discipline-modal-${disciplineId}`} className="rounded-lg shadow-lg backdrop:bg-black/50">
        <div className="w-full max-w-md p-6">
          <div className="mb-4 flex items-start gap-3">
            <div className="rounded-full bg-amber-100 p-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">确认删除</h3>
              <p className="mt-1 text-sm text-slate-600">
                确认删除这条违纪记录吗？删除后该条扣分将不再计入德育扣分统计。
              </p>
            </div>
          </div>

          {/* 错误提示 */}
          {state.message && !state.success && (
            <div className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-600">
              {state.message}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                const modal = document.getElementById(`delete-discipline-modal-${disciplineId}`) as HTMLDialogElement;
                modal?.close();
              }}
              className="rounded border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              disabled={isPending}
            >
              取消
            </button>
            <form action={formAction} method="POST">
              <button
                type="submit"
                className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                disabled={isPending}
              >
                {isPending ? "删除中..." : "确认删除"}
              </button>
            </form>
          </div>
        </div>
      </dialog>
    </>
  );
}
