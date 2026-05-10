"use client";

import { useActionState, useRef } from "react";
import { Trash2 } from "lucide-react";
import { actionUrl } from "@/lib/action-utils";
import { deleteDiscipline } from "./actions";

export function DeleteDisciplineRowButton({ id, variant = "icon" }: { id: number; variant?: "icon" | "menu" }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, isPending] = useActionState(
    async (_prev: { ok: boolean; error?: string } | null, _formData: FormData) => {
      try {
        await deleteDiscipline(id);
        window.location.href = actionUrl("/discipline", { notice: "违纪记录已删除" });
        return { ok: true };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "删除失败";
        return { ok: false, error: msg };
      }
    },
    null
  );

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={
          variant === "menu"
            ? "flex h-8 w-full items-center justify-start gap-2 rounded px-3 text-left text-xs font-medium text-red-600 hover:bg-red-50"
            : "inline-flex h-8 w-8 items-center justify-center rounded border border-red-200 text-red-600 hover:bg-red-50"
        }
        title="删除"
      >
        <Trash2 size={15} />
        {variant === "menu" ? "删除" : null}
      </button>
      <dialog ref={dialogRef} className="rounded-lg p-0 shadow-xl backdrop:bg-black/30">
        <div className="p-5">
          <h3 className="text-base font-semibold text-slate-900">确认删除</h3>
          <p className="mt-2 text-sm text-slate-600">确定要删除这条违纪记录吗？此操作不可撤销。</p>
          {state?.ok === false && (
            <p className="mt-2 text-sm text-red-600">{state.error}</p>
          )}
          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="h-8 rounded border border-slate-300 px-3 text-sm text-slate-700 hover:bg-slate-50"
            >
              取消
            </button>
            <form action={formAction} method="POST">
              <button
                type="submit"
                disabled={isPending}
                className="h-8 rounded bg-red-600 px-3 text-sm text-white hover:bg-red-700 disabled:opacity-50"
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
