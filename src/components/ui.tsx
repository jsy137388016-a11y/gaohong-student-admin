"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { MoreHorizontal, Plus, Save, Search, Trash2, X } from "lucide-react";

/**
 * 确认删除按钮（客户端组件）
 * 用法：
 *   import { ConfirmButton } from "@/components/ui";
 *   <form action={...}>
 *     <ConfirmButton label="删除" confirmText="确认删除吗？" />
 *   </form>
 *
 * 注意：必须在 <form> 内使用，onClick 会阻止默认提交并弹出确认框，
 *       用户点取消则不提交，点确定才真正提交。
 */
export function ConfirmButton({
  label = "删除",
  confirmText = "确认删除吗？",
  variant = "danger" as "danger" | "warning",
  size = "default" as "default" | "small",
}: {
  label?: string;
  confirmText?: string;
  /** danger = 红色（删除），warning = 琥珀色（退学/停用） */
  variant?: "danger" | "warning";
  size?: "default" | "small";
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="button"
      onClick={(e) => {
        if (pending) return;
        if (!window.confirm(confirmText)) {
          e.preventDefault();
          return;
        }
        // 让表单继续提交
        const form = (e.currentTarget as HTMLButtonElement).closest("form");
        if (form) form.requestSubmit();
      }}
      disabled={pending}
      className={`inline-flex items-center gap-1 rounded-lg border bg-white font-medium shadow-sm transition-colors hover:opacity-90 ${
        variant === "danger"
          ? "border-red-200 text-red-600 hover:bg-red-50"
          : "border-amber-200 text-amber-700 hover:bg-amber-50"
      } ${
        size === "small"
          ? "h-8 px-3 text-xs"
          : "h-8 px-3 text-xs"
      }`}
    >
      <Trash2 size={14} />
      {pending ? "处理中..." : label}
    </button>
  );
}

export function PageTitle({
  title,
  description
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-7">
      <h1 className="text-[26px] font-semibold leading-tight text-slate-950">{title}</h1>
      {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p> : null}
    </div>
  );
}

export function Panel({
  children,
  title,
  actions
}: {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      {title || actions ? (
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          {title ? <div className="text-sm font-semibold text-slate-950">{title}</div> : <div />}
          {actions}
        </div>
      ) : null}
      <div className="p-5 lg:p-6">{children}</div>
    </section>
  );
}

export const inputClass =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export const textareaClass =
  "min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export function Field({
  label,
  children,
  required
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

export function PrimaryButton({ children = "保存" }: { children?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Save size={16} />
      {pending ? "保存中..." : children}
    </button>
  );
}

export function AddButton({ children = "新增" }: { children?: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Plus size={16} />
      {pending ? "提交中..." : children}
    </button>
  );
}

export function SearchButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Search size={16} />
      {pending ? "查询中..." : "查询"}
    </button>
  );
}

export function DeleteButton({ confirmText = "确认删除吗？" }: { confirmText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={(e) => {
        if (pending) return;
        if (!window.confirm(confirmText)) return;
        e.currentTarget.closest("form")?.requestSubmit();
      }}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 shadow-sm transition-colors hover:bg-red-50"
      title="删除"
    >
      <Trash2 size={15} />
    </button>
  );
}

export function MoreActions({ children }: { children: React.ReactNode }) {
  return (
    <details className="group relative inline-block text-left">
      <summary className="inline-flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 [&::-webkit-details-marker]:hidden" title="更多操作">
        <MoreHorizontal size={16} />
      </summary>
      <div className="absolute right-0 z-20 mt-1 min-w-32 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
        <div className="grid gap-1">{children}</div>
      </div>
    </details>
  );
}

export const menuItemClass =
  "flex h-8 w-full items-center justify-start gap-2 rounded-md px-3 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50";

export const dangerMenuItemClass =
  "flex h-8 w-full items-center justify-start gap-2 rounded-md px-3 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50";

export function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm [&_tbody_tr:nth-child(even)]:bg-slate-50/50 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-brand-50/40 [&_td]:h-14 [&_thead]:bg-slate-100 [&_thead]:normal-case [&_th]:h-12 [&_th]:whitespace-nowrap [&_th]:normal-case [&_th]:text-slate-600">
      {children}
    </div>
  );
}

export function EmptyText({ text = "暂无数据" }: { text?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
        <Search size={18} />
      </div>
      <div className="text-sm font-medium text-slate-600">{text}</div>
      <div className="mt-1 text-xs text-slate-400">调整筛选条件后再试试</div>
    </div>
  );
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
      {children}
    </div>
  );
}

export function ModalShell({
  open,
  title,
  children,
  onClose,
  maxWidth = "max-w-2xl"
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6" onClick={onClose}>
      <div
        className={`flex max-h-[88vh] w-full ${maxWidth} flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-900/10`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-950">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
