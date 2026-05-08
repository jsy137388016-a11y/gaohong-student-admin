"use client";

import { useState, useTransition } from "react";
import { CheckCircle, Download, FileSpreadsheet, UploadCloud, XCircle } from "lucide-react";
import { ModalShell } from "@/components/ui";
import type { DisciplineImportResult, DisciplineImportRow, DisciplinePreviewResult } from "./discipline-import-actions";
import { confirmDisciplineImport, validateDisciplineImport } from "./discipline-import-actions";

const templateRows = [
  ["学号", "学生姓名", "班级", "日期", "类型", "内容", "扣分", "处理结果", "备注"],
  ["GH2026001", "张三", "高三1班", "2026-05-08", "迟到", "早读迟到10分钟", "1", "批评教育", "示例：迟到/旷课/早退会同步考勤"],
  ["GH2026002", "李四", "高三1班", "2026-05-08", "课堂纪律", "上课玩手机", "2", "手机暂存并通知家长", ""]
];

export function DisciplineImportPanel() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [previewResult, setPreviewResult] = useState<DisciplinePreviewResult | null>(null);
  const [importResult, setImportResult] = useState<DisciplineImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  async function downloadTemplate() {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.aoa_to_sheet(templateRows);
    ws["!cols"] = [
      { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 28 }, { wch: 8 }, { wch: 20 }, { wch: 32 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "纪律导入模板");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "纪律记录导入模板.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File) {
    setError("");
    setPreviewResult(null);
    setImportResult(null);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !["xlsx", "xls", "csv"].includes(ext)) {
      setError("请上传 .xlsx / .xls / .csv 文件");
      return;
    }

    try {
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array", cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" });
      if (rawRows.length <= 1) {
        setError("表格中没有可导入的数据");
        return;
      }

      const header = rawRows[0].map((cell) => normalizeHeader(cell));
      const col = {
        studentNo: findColumn(header, ["学号", "学生编号", "studentno"]),
        studentName: findColumn(header, ["学生姓名", "姓名", "学生", "studentname"]),
        className: findColumn(header, ["班级", "班级名称", "class"]),
        date: findColumn(header, ["日期", "记录日期", "时间", "date"]),
        violationType: findColumn(header, ["类型", "违纪类型", "纪律类型", "violationtype"]),
        description: findColumn(header, ["内容", "违纪内容", "违纪描述", "描述", "description"]),
        deductScore: findColumn(header, ["扣分", "分值", "deductscore"]),
        result: findColumn(header, ["处理结果", "结果", "result"]),
        remark: findColumn(header, ["备注", "remark"])
      };

      const rows: DisciplineImportRow[] = rawRows.slice(1)
        .map((raw, index) => ({
          rowNo: index + 2,
          studentNo: readCell(raw, col.studentNo),
          studentName: readCell(raw, col.studentName),
          className: readCell(raw, col.className),
          date: readCell(raw, col.date),
          violationType: readCell(raw, col.violationType),
          description: readCell(raw, col.description),
          deductScore: parseNumber(readCell(raw, col.deductScore)),
          result: readCell(raw, col.result),
          remark: readCell(raw, col.remark)
        }))
        .filter((row) => [row.studentNo, row.studentName, row.className, row.date, row.violationType, row.description].some(Boolean));

      if (rows.length === 0) {
        setError("没有识别到可导入的数据行");
        return;
      }

      startTransition(async () => {
        try {
          const result = await validateDisciplineImport(rows);
          setPreviewResult(result);
        } catch (e: any) {
          setError(e?.message || "校验失败");
        }
      });
    } catch (e: any) {
      setError("读取文件失败：" + (e?.message || "未知错误"));
    }
  }

  function handleConfirmImport() {
    if (!previewResult) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await confirmDisciplineImport(previewResult.rows);
        setImportResult(result);
        if (result.success) setPreviewResult(null);
      } catch (e: any) {
        setError(e?.message || "导入失败");
      }
    });
  }

  function reset() {
    setPreviewResult(null);
    setImportResult(null);
    setError("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-4 text-sm font-medium text-brand-700 hover:bg-brand-100"
      >
        <FileSpreadsheet size={16} />
        批量导入
      </button>

      <ModalShell open={open} title="批量导入纪律记录" onClose={() => !isPending && setOpen(false)} maxWidth="max-w-5xl">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <button type="button" onClick={downloadTemplate} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100">
              <Download size={15} />
              下载模板
            </button>
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white hover:bg-brand-700">
              <UploadCloud size={15} />
              选择文件
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" disabled={isPending} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </label>
            <span className="text-xs text-slate-500">模板字段：学号、学生姓名、班级、日期、类型、内容、扣分、处理结果、备注</span>
          </div>

          {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
          {importResult ? <div className={`rounded-lg border px-4 py-3 text-sm ${importResult.success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{importResult.message}</div> : null}

          {previewResult ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <Stat label="总行数" value={previewResult.totalRows} />
                <Stat label="可导入" value={previewResult.okRows} tone="green" />
                <Stat label="错误" value={previewResult.errorRows} tone="red" />
                <Stat label="将同步考勤" value={previewResult.syncRows} tone="blue" />
              </div>
              <div className="max-h-[420px] overflow-auto rounded-lg border border-slate-200">
                <table className="min-w-[980px] divide-y divide-slate-200 text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                    <tr>
                      <th className="px-3 py-2">行号</th>
                      <th className="px-3 py-2">状态</th>
                      <th className="px-3 py-2">学生</th>
                      <th className="px-3 py-2">班级</th>
                      <th className="px-3 py-2">日期</th>
                      <th className="px-3 py-2">类型</th>
                      <th className="px-3 py-2">内容</th>
                      <th className="px-3 py-2">扣分</th>
                      <th className="px-3 py-2">提示</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {previewResult.rows.map((row) => (
                      <tr key={row.rowNo}>
                        <td className="px-3 py-2">{row.rowNo}</td>
                        <td className="px-3 py-2">
                          {row.status === "ok" ? <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle size={13} /> 可导入</span> : <span className="inline-flex items-center gap-1 text-red-700"><XCircle size={13} /> 错误</span>}
                        </td>
                        <td className="px-3 py-2">{row.matchedStudentName || row.studentName || row.studentNo}</td>
                        <td className="px-3 py-2">{row.className || "—"}</td>
                        <td className="px-3 py-2">{row.date || "—"}</td>
                        <td className="px-3 py-2">{row.violationType || "—"}</td>
                        <td className="px-3 py-2">{row.description || "—"}</td>
                        <td className="px-3 py-2">{row.deductScore ?? 0}</td>
                        <td className="px-3 py-2 text-xs text-slate-500">{row.errorReason || row.warningReason || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={reset} disabled={isPending} className="h-10 rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">重新选择</button>
                <button type="button" onClick={handleConfirmImport} disabled={isPending || previewResult.okRows === 0} className="h-10 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
                  {isPending ? "导入中..." : `确认导入 ${previewResult.okRows} 条`}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </ModalShell>
    </>
  );
}

function Stat({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "green" | "red" | "blue" }) {
  const toneClass = {
    slate: "bg-slate-50 text-slate-900",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700"
  }[tone];
  return <div className={`rounded-lg border border-slate-200 p-3 ${toneClass}`}><div className="text-2xl font-bold">{value}</div><div className="text-xs opacity-75">{label}</div></div>;
}

function normalizeHeader(value: unknown) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function findColumn(header: string[], names: string[]) {
  const normalized = names.map(normalizeHeader);
  return header.findIndex((item) => normalized.includes(item));
}

function readCell(raw: any[], index: number) {
  if (index < 0) return "";
  return String(raw[index] ?? "").trim();
}

function parseNumber(value: string) {
  if (!value) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}
