"use client";

import { useState, useRef, useTransition } from "react";
import { Upload, Download, CheckCircle, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import type { ImportRow, PreviewRow, PreviewResult, ImportResult } from "@/app/exams/score-import-actions";
import { validateScoreImport, confirmScoreImport } from "@/app/exams/score-import-actions";

// ====== 满分配置 ======

type SubjectKey = "chinese" | "math" | "english" | "japanese" | "russian"
  | "physics" | "history" | "geography" | "politics" | "biology" | "chemistry";

const FULL_SCORES: Record<SubjectKey, number> = {
  chinese: 150, math: 150, english: 150, japanese: 150, russian: 150,
  physics: 100, history: 100, geography: 100, politics: 100, biology: 100, chemistry: 100,
};

const SUBJECT_LABELS: Record<SubjectKey, string> = {
  chinese: "语文", math: "数学", english: "英语", japanese: "日语",
  russian: "俄语", physics: "物理", history: "历史", geography: "地理",
  politics: "政治", biology: "生物", chemistry: "化学",
};

const ALL_SUBJECTS = [
  "chinese", "math", "english", "japanese", "russian",
  "physics", "history", "geography", "politics", "biology", "chemistry",
] as const;

// ====== Props ======

interface ScoreImportProps {
  examId: number;
  examName: string;
  examGrade: string;
}

// ====== 主组件 ======

export function ScoreImportPanel({ examId, examName, examGrade }: ScoreImportProps) {
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [duplicateMode, setDuplicateMode] = useState<"overwrite" | "skip" | "fill_empty">("overwrite");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 下载 Excel 模板
  async function handleDownloadTemplate() {
    try {
      const XLSX = await import("xlsx");
      const headers = [
        "班级", "学号", "学生姓名", "手机号",
        "语文", "数学", "英语", "日语", "俄语",
        "历史", "物理", "地理", "政治", "生物", "化学",
        "备注",
      ];

      const tipRow = [
        "", "", "", "",
        "满分150", "满分150", "满分150", "满分150", "满分150",
        "满分100", "满分100", "满分100", "满分100", "满分100", "满分100",
        "",
      ];

      const ws = XLSX.utils.aoa_to_sheet([headers, tipRow]);

      ws["!cols"] = [
        { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 },
        { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
        { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
        { wch: 16 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "成绩导入模板");

      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `成绩导入模板_${examGrade || ""}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError("下载模板失败：" + (e?.message || "未知错误"));
    }
  }

  // 上传并解析 Excel
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setPreviewResult(null);
    setImportResult(null);

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls" && ext !== "csv") {
      setError("请上传 .xlsx 或 .csv 格式的文件");
      return;
    }

    try {
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array", codepage: 936 });

      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const jsonData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

      if (jsonData.length < 2) {
        setError("Excel 文件为空或没有数据行");
        return;
      }

      const headerRow = jsonData[0].map((h: any) => String(h || "").trim());
      const colMap = buildColumnMap(headerRow);

      if (colMap.studentName === -1) {
        setError("Excel 模板缺少「学生姓名」列，请使用标准模板");
        return;
      }

      const rows: ImportRow[] = [];
      for (let i = 1; i < jsonData.length; i++) {
        const raw = jsonData[i];
        if (!raw || raw.length === 0) continue;

        const hasData = raw.some((cell: any) => cell !== "" && cell !== null && cell !== undefined);
        if (!hasData) continue;

        // 跳过满分提示行
        const firstVal = String(raw[0] || "").trim();
        if (!firstVal && String(raw[4] || "").includes("满分")) continue;

        const row: ImportRow = {
          rowNo: i + 1,
          className: colMap.className >= 0 ? String(raw[colMap.className] || "").trim() : "",
          studentNo: colMap.studentNo >= 0 ? String(raw[colMap.studentNo] || "").trim() : "",
          studentName: colMap.studentName >= 0 ? String(raw[colMap.studentName] || "").trim() : "",
          phone: colMap.phone >= 0 ? String(raw[colMap.phone] || "").trim() : "",
          chinese: parseScore(raw, colMap.chinese),
          math: parseScore(raw, colMap.math),
          english: parseScore(raw, colMap.english),
          japanese: parseScore(raw, colMap.japanese),
          russian: parseScore(raw, colMap.russian),
          physics: parseScore(raw, colMap.physics),
          history: parseScore(raw, colMap.history),
          geography: parseScore(raw, colMap.geography),
          politics: parseScore(raw, colMap.politics),
          biology: parseScore(raw, colMap.biology),
          chemistry: parseScore(raw, colMap.chemistry),
          remark: colMap.remark >= 0 ? String(raw[colMap.remark] || "").trim() : "",
        };

        // 跳过姓名为空且所有科目都为空的行
        if (!row.studentName && ALL_SUBJECTS.every((s) => row[s] === null)) continue;

        rows.push(row);
      }

      if (rows.length === 0) {
        setError("解析后没有有效数据行");
        return;
      }

      startTransition(async () => {
        try {
          const result = await validateScoreImport(examId, rows);
          setPreviewResult(result);
        } catch (e: any) {
          setError("校验失败：" + (e?.message || "未知错误"));
        }
      });
    } catch (e: any) {
      setError("解析 Excel 文件失败：" + (e?.message || "未知错误"));
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // 确认导入
  function handleConfirmImport() {
    if (!previewResult) return;

    startTransition(async () => {
      try {
        const importableRows = previewResult.rows.filter((r) => r.status === "ok" || r.status === "duplicate");
        const result = await confirmScoreImport(examId, importableRows, duplicateMode);
        setImportResult(result);
        // 不刷新页面，直接显示结果
      } catch (e: any) {
        setError("导入失败：" + (e?.message || "未知错误"));
      }
    });
  }

  // 重置
  function handleReset() {
    setPreviewResult(null);
    setImportResult(null);
    setError(null);
  }

  return (
    <section className="rounded border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4 text-sm font-semibold text-slate-900">
        Excel 批量导入成绩
      </div>
      <div className="p-5 space-y-4">
        {/* 错误提示 */}
        {error && (
          <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 导入结果 */}
        {importResult && (
          <div className={`flex items-start gap-2 rounded border px-4 py-3 text-sm ${importResult.success ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>
            {importResult.success ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
            <span>{importResult.message}</span>
          </div>
        )}

        {/* 操作按钮区 */}
        {!previewResult && !importResult && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex h-10 items-center gap-2 rounded border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download size={16} />
              下载 Excel 成绩模板
            </button>
            <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700">
              <Upload size={16} />
              上传 Excel 文件
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            <span className="text-xs text-slate-500">支持 .xlsx / .csv 格式</span>
          </div>
        )}

        {/* 预览区域 */}
        {previewResult && !importResult && (
          <div className="space-y-4">
            {/* 统计摘要 */}
            <div className="grid grid-cols-4 gap-3">
              <StatCard label="总行数" value={previewResult.totalRows} color="slate" />
              <StatCard label="可导入" value={previewResult.okRows} color="green" />
              <StatCard label="重复" value={previewResult.duplicateRows} color="amber" />
              <StatCard label="错误" value={previewResult.errorRows} color="red" />
            </div>

            {/* 重复处理方式 */}
            {previewResult.duplicateRows > 0 && (
              <div className="rounded border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="mb-2 text-sm font-medium text-amber-800">
                  检测到 {previewResult.duplicateRows} 条重复成绩，请选择处理方式：
                </p>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="dupMode_exam"
                      value="overwrite"
                      checked={duplicateMode === "overwrite"}
                      onChange={() => setDuplicateMode("overwrite")}
                    />
                    覆盖已有成绩（默认）
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="dupMode_exam"
                      value="skip"
                      checked={duplicateMode === "skip"}
                      onChange={() => setDuplicateMode("skip")}
                    />
                    跳过已有成绩
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="dupMode_exam"
                      value="fill_empty"
                      checked={duplicateMode === "fill_empty"}
                      onChange={() => setDuplicateMode("fill_empty")}
                    />
                    只更新空成绩（0分视为空）
                  </label>
                </div>
              </div>
            )}

            {/* 预览表格 */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">行号</th>
                    <th className="px-3 py-2">班级</th>
                    <th className="px-3 py-2">学生姓名</th>
                    <th className="px-3 py-2">手机号</th>
                    {ALL_SUBJECTS.map((subj) => (
                      <th key={subj} className="px-3 py-2">{SUBJECT_LABELS[subj]}</th>
                    ))}
                    <th className="px-3 py-2">状态</th>
                    <th className="px-3 py-2">原因</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewResult.rows.map((row, idx) => (
                    <tr key={idx} className={statusBg(row.status)}>
                      <td className="px-3 py-2">{row.rowNo}</td>
                      <td className="px-3 py-2">{row.className}</td>
                      <td className="px-3 py-2 font-medium">
                        {row.matchedStudentName && row.matchedStudentName !== row.studentName
                          ? `${row.studentName}→${row.matchedStudentName}`
                          : row.studentName}
                      </td>
                      <td className="px-3 py-2">{row.phone}</td>
                      {ALL_SUBJECTS.map((subj) => (
                        <td key={subj} className="px-3 py-2">{fmtScore(row[subj])}</td>
                      ))}
                      <td className="px-3 py-2"><RowStatusBadge status={row.status} /></td>
                      <td className="px-3 py-2 text-xs text-slate-600">{row.errorReason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isPending || (previewResult.okRows + previewResult.duplicateRows === 0)}
                className="inline-flex h-10 items-center gap-2 rounded bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                确认导入（{previewResult.okRows + previewResult.duplicateRows} 条）
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={isPending}
                className="inline-flex h-10 items-center gap-2 rounded border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 导入完成后的操作 */}
        {importResult && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex h-10 items-center gap-2 rounded border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              继续导入
            </button>
          </div>
        )}

        {/* Loading */}
        {isPending && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" />
            正在处理...
          </div>
        )}
      </div>
    </section>
  );
}

// ====== 辅助组件 ======

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    slate: "bg-slate-50 text-slate-900",
    green: "bg-green-50 text-green-800",
    amber: "bg-amber-50 text-amber-800",
    red: "bg-red-50 text-red-800"
  };
  return (
    <div className={`rounded px-4 py-3 ${colorMap[color] || colorMap.slate}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium opacity-75">{label}</div>
    </div>
  );
}

function RowStatusBadge({ status }: { status: string }) {
  if (status === "ok") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
        <CheckCircle size={12} /> 可导入
      </span>
    );
  }
  if (status === "duplicate") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        <AlertTriangle size={12} /> 重复
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
      <XCircle size={12} /> 错误
    </span>
  );
}

function statusBg(status: string): string {
  if (status === "error") return "bg-red-50/50";
  if (status === "duplicate") return "bg-amber-50/50";
  return "";
}

function fmtScore(val: number | null): string {
  if (val === null || val === undefined) return "-";
  return String(val);
}

// ====== 列映射 ======

function buildColumnMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {
    className: -1, studentNo: -1, studentName: -1, phone: -1,
    chinese: -1, math: -1, english: -1, japanese: -1, russian: -1,
    physics: -1, history: -1, geography: -1, politics: -1, biology: -1, chemistry: -1,
    remark: -1,
  };

  const aliases: Record<string, string[]> = {
    className: ["班级", "班", "班级名称", "class"],
    studentNo: ["学号", "学生学号", "student_no", "studentno"],
    studentName: ["学生姓名", "姓名", "名字", "学生", "name", "student_name"],
    phone: ["手机号", "手机", "电话", "phone", "联系方式"],
    chinese: ["语文", "chinese", "yuwen"],
    math: ["数学", "math", "shuxue"],
    english: ["英语", "english", "yingyu"],
    japanese: ["日语", "japanese", "riyu"],
    russian: ["俄语", "russian", "eyu"],
    physics: ["物理", "physics", "wuli"],
    history: ["历史", "history", "lishi"],
    geography: ["地理", "geography", "dili"],
    politics: ["政治", "politics", "zhengzhi"],
    biology: ["生物", "biology", "shengwu"],
    chemistry: ["化学", "chemistry", "huaxue"],
    remark: ["备注", "说明", "remark", "note"],
  };

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();
    for (const [field, fieldAliases] of Object.entries(aliases)) {
      if (map[field] >= 0) continue;
      if (fieldAliases.some((alias) => h === alias.toLowerCase() || h.includes(alias.toLowerCase()))) {
        map[field] = i;
      }
    }
  }

  return map;
}

function parseScore(raw: any[], colIndex: number): number | null {
  if (colIndex < 0) return null;
  const val = raw[colIndex];
  if (val === "" || val === null || val === undefined) return null;
  const num = Number(val);
  if (!Number.isFinite(num)) return null;
  return num;
}
