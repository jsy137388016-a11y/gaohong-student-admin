"use client";

import { useState, useRef, useTransition } from "react";
import { Upload, Download, CheckCircle, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import type { StudentImportRow, StudentPreviewRow, StudentPreviewResult, StudentImportResult } from "@/app/students/student-import-actions";
import { validateStudentImport, confirmStudentImport } from "@/app/students/student-import-actions";

// ====== 主组件 ======

export function StudentImportPanel() {
  const [previewResult, setPreviewResult] = useState<StudentPreviewResult | null>(null);
  const [importResult, setImportResult] = useState<StudentImportResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 下载 Excel 模板
  async function handleDownloadTemplate() {
    try {
      const XLSX = await import("xlsx");
      const headers = ["班级", "姓名", "性别", "年级", "手机号", "家长姓名", "家长电话", "住宿状态", "艺考专业", "备注"];
      const example1 = ["856班", "王小明", "男", "高三", "13800001111", "王先生", "13900001111", "住宿", "播音主持", "数学需重点跟进"];
      const example2 = ["", "刘雨", "女", "高二", "", "刘女士", "13900002222", "走读", "美术", ""];

      const ws = XLSX.utils.aoa_to_sheet([headers, example1, example2]);

      // 设置列宽
      ws["!cols"] = [
        { wch: 12 }, // 班级
        { wch: 10 }, // 姓名
        { wch: 6 },  // 性别
        { wch: 8 },  // 年级
        { wch: 14 }, // 手机号
        { wch: 10 }, // 家长姓名
        { wch: 14 }, // 家长电话
        { wch: 10 }, // 住宿状态
        { wch: 12 }, // 艺考专业
        { wch: 20 }  // 备注
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "学生导入模板");

      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "学生导入模板.xlsx";
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

    // 检查文件类型
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls" && ext !== "csv") {
      setError("请上传 .xlsx 或 .csv 格式的文件");
      return;
    }

    try {
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array", codepage: 936 });

      // 取第一个 Sheet
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const jsonData: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

      if (jsonData.length < 2) {
        setError("Excel 文件为空或没有数据行（至少需要标题行 + 1行数据）");
        return;
      }

      // 解析标题行，建立列映射
      const headerRow = jsonData[0].map((h: any) => String(h || "").trim());
      const colMap = buildColumnMap(headerRow);

      if (colMap.name === -1) {
        setError("Excel 模板缺少「姓名」列，请使用标准模板");
        return;
      }

      // 解析数据行（跳过标题行）
      const rows: StudentImportRow[] = [];
      for (let i = 1; i < jsonData.length; i++) {
        const raw = jsonData[i];
        if (!raw || raw.length === 0) continue;

        // 跳过全空行
        const hasData = raw.some((cell: any) => cell !== "" && cell !== null && cell !== undefined);
        if (!hasData) continue;

        const row: StudentImportRow = {
          rowNo: i + 1, // Excel 行号从1开始，加上标题行
          className: colMap.className >= 0 ? String(raw[colMap.className] || "").trim() : "",
          name: colMap.name >= 0 ? String(raw[colMap.name] || "").trim() : "",
          gender: colMap.gender >= 0 ? String(raw[colMap.gender] || "").trim() : "",
          grade: colMap.grade >= 0 ? String(raw[colMap.grade] || "").trim() : "",
          phone: colMap.phone >= 0 ? String(raw[colMap.phone] || "").trim() : "",
          parentName: colMap.parentName >= 0 ? String(raw[colMap.parentName] || "").trim() : "",
          parentPhone: colMap.parentPhone >= 0 ? String(raw[colMap.parentPhone] || "").trim() : "",
          boardingStatus: colMap.boardingStatus >= 0 ? String(raw[colMap.boardingStatus] || "").trim() : "",
          artMajor: colMap.artMajor >= 0 ? String(raw[colMap.artMajor] || "").trim() : "",
          remark: colMap.remark >= 0 ? String(raw[colMap.remark] || "").trim() : ""
        };
        rows.push(row);
      }

      if (rows.length === 0) {
        setError("解析后没有有效数据行");
        return;
      }

      // 提交到后端校验
      startTransition(async () => {
        try {
          const result = await validateStudentImport(rows);
          setPreviewResult(result);
        } catch (e: any) {
          setError("校验失败：" + (e?.message || "未知错误"));
        }
      });
    } catch (e: any) {
      setError("解析 Excel 文件失败：" + (e?.message || "未知错误"));
    }

    // 重置 input，允许重复选择同一文件
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // 确认导入
  function handleConfirmImport() {
    if (!previewResult) return;

    startTransition(async () => {
      try {
        const importableRows = previewResult.rows.filter((r) => r.status === "ok");
        const result = await confirmStudentImport(importableRows);
        setImportResult(result);
        // 不在自动刷新，导入结果直接在本页面显示
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
        Excel 批量导入学生
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
          <div className={`flex flex-col gap-2 rounded border px-4 py-3 text-sm ${importResult.success ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>
            <div className="flex items-start gap-2">
              {importResult.success ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
              <span className="font-medium">{importResult.message}</span>
            </div>
            {importResult.failedReasons.length > 0 && (
              <div className="mt-1 pl-6 text-xs text-red-700 space-y-1">
                {importResult.failedReasons.slice(0, 10).map((r, i) => (
                  <div key={i}>{r}</div>
                ))}
                {importResult.failedReasons.length > 10 && (
                  <div>...还有 {importResult.failedReasons.length - 10} 条失败原因</div>
                )}
              </div>
            )}
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
              下载 Excel 学生模板
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
            <div className="grid grid-cols-5 gap-3">
              <StatCard label="总行数" value={previewResult.totalRows} color="slate" />
              <StatCard label="可导入" value={previewResult.okRows} color="green" />
              <StatCard label="重复" value={previewResult.duplicateRows} color="amber" />
              <StatCard label="错误" value={previewResult.errorRows} color="red" />
              <StatCard label="新建班级" value={previewResult.newClassCount} color="blue" />
            </div>

            {/* 预览表格 */}
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500 sticky top-0">
                  <tr>
                    <th className="px-3 py-2">行号</th>
                    <th className="px-3 py-2">班级</th>
                    <th className="px-3 py-2">姓名</th>
                    <th className="px-3 py-2">性别</th>
                    <th className="px-3 py-2">年级</th>
                    <th className="px-3 py-2">手机号</th>
                    <th className="px-3 py-2">家长姓名</th>
                    <th className="px-3 py-2">家长电话</th>
                    <th className="px-3 py-2">住宿</th>
                    <th className="px-3 py-2">专业</th>
                    <th className="px-3 py-2">状态</th>
                    <th className="px-3 py-2">原因</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewResult.rows.map((row, idx) => (
                    <tr key={idx} className={statusBg(row.status)}>
                      <td className="px-3 py-2">{row.rowNo}</td>
                      <td className="px-3 py-2">{row.className || "—"}</td>
                      <td className="px-3 py-2 font-medium">{row.name}</td>
                      <td className="px-3 py-2">{row.gender}</td>
                      <td className="px-3 py-2">{row.grade}</td>
                      <td className="px-3 py-2">{row.phone || "—"}</td>
                      <td className="px-3 py-2">{row.parentName}</td>
                      <td className="px-3 py-2">{row.parentPhone}</td>
                      <td className="px-3 py-2">{row.boardingStatus}</td>
                      <td className="px-3 py-2">{row.artMajor || "—"}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={row.status} />
                      </td>
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
                disabled={isPending || previewResult.okRows === 0}
                className="inline-flex h-10 items-center gap-2 rounded bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                确认导入（{previewResult.okRows} 条）
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
    red: "bg-red-50 text-red-800",
    blue: "bg-blue-50 text-blue-800"
  };
  return (
    <div className={`rounded px-4 py-3 ${colorMap[color] || colorMap.slate}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium opacity-75">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
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

// ====== 列映射辅助 ======

function buildColumnMap(headers: string[]): {
  className: number;
  name: number;
  gender: number;
  grade: number;
  phone: number;
  parentName: number;
  parentPhone: number;
  boardingStatus: number;
  artMajor: number;
  remark: number;
} {
  const map: Record<string, number> = {
    className: -1,
    name: -1,
    gender: -1,
    grade: -1,
    phone: -1,
    parentName: -1,
    parentPhone: -1,
    boardingStatus: -1,
    artMajor: -1,
    remark: -1
  };

  const columnAliases: Record<string, string[]> = {
    className: ["班级", "班", "班级名称", "class"],
    name: ["姓名", "学生姓名", "名字", "学生", "name", "student_name"],
    gender: ["性别", "gender", "sex"],
    grade: ["年级", "grade", "年级"],
    phone: ["手机号", "手机", "电话", "phone", "学生手机号", "学生手机", "联系方式"],
    parentName: ["家长姓名", "家长名字", "parent_name", "parentname"],
    parentPhone: ["家长电话", "家长手机", "家长手机号", "parent_phone", "parentphone"],
    boardingStatus: ["住宿状态", "住宿", "boarding", "住宿方式"],
    artMajor: ["艺考专业", "专业", "艺术专业", "art_major", "artmajor"],
    remark: ["备注", "说明", "remark", "note"]
  };

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();
    for (const [field, aliases] of Object.entries(columnAliases)) {
      if (map[field] >= 0) continue; // 已映射过就跳过
      if (aliases.some((alias) => h === alias.toLowerCase() || h.includes(alias.toLowerCase()))) {
        map[field] = i;
      }
    }
  }

  return map as any;
}
