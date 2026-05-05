"use client";

import { Plus, Save, Search, Trash2 } from "lucide-react";

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
  return (
    <button
      type="button"
      onClick={(e) => {
        if (!window.confirm(confirmText)) {
          e.preventDefault();
          return;
        }
        // 让表单继续提交
        const form = (e.currentTarget as HTMLButtonElement).closest("form");
        if (form) form.requestSubmit();
      }}
      className={`inline-flex items-center gap-1 rounded border font-medium hover:opacity-80 ${
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
      {label}
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
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
      {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
    </div>
  );
}

export function Panel({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <section className="rounded border border-slate-200 bg-white">
      {title ? <div className="border-b border-slate-200 px-5 py-4 text-sm font-semibold text-slate-900">{title}</div> : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export const inputClass =
  "h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

export const textareaClass =
  "min-h-24 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

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
  return (
    <button className="inline-flex h-10 items-center gap-2 rounded bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700">
      <Save size={16} />
      {children}
    </button>
  );
}

export function AddButton({ children = "新增" }: { children?: React.ReactNode }) {
  return (
    <button className="inline-flex h-10 items-center gap-2 rounded bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700">
      <Plus size={16} />
      {children}
    </button>
  );
}

export function SearchButton() {
  return (
    <button className="inline-flex h-10 items-center gap-2 rounded border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
      <Search size={16} />
      查询
    </button>
  );
}

export function DeleteButton() {
  return (
    <button
      className="inline-flex h-8 w-8 items-center justify-center rounded border border-red-200 text-red-600 hover:bg-red-50"
      title="删除"
    >
      <Trash2 size={15} />
    </button>
  );
}

export function TableShell({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded border border-slate-200 bg-white">{children}</div>;
}

export function EmptyText({ text = "暂无数据" }: { text?: string }) {
  return <div className="rounded border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">{text}</div>;
}
