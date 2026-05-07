"use client";

import { useState, useRef, useTransition } from "react";
import { Upload, Download, CheckCircle, AlertTriangle, XCircle, Loader2, Plus, X } from "lucide-react";
import type {
  ScoreImportRow,
  ScorePreviewRow,
  ScorePreviewResult,
  ScoreImportResult,
} from "@/app/classes/[id]/score-import-actions";
import {
  validateScoreImport,
  confirmScoreImport,
  getClassStudents,
  getExams,
  createExamQuick,
} from "@/app/classes/[id]/score-import-actions";

// ====== 满分配置（与后端一致） ======

type SubjectKey = "chinese" | "math" | "english" | "japanese" | "russian"
  | "physics" | "history" | "geography" | "politics" | "biology" | "chemistry";

const FULL_SCORES: Record<SubjectKey, number> = {
  chinese: 150, math: 150, english: 150, japanese: 150, russian: 150,
  physics: 100, history: 100, geography: 100, politics: 100, biology: 100, chemistry: 100,
};

const SUBJECT_ORDER = [
  "chinese", "math", "english", "japanese", "russian",
  "physics", "history", "geography", "politics", "biology", "chemistry",
] as const;

// ====== Props ======

interface ClassScoreImportProps {
  classId: number;
  className: string;
  grade: string;
}

// ====== 右上角按钮组件（直接嵌入页面按钮行） ======

export function ClassScoreImportButtons({ classId, className, grade }: ClassScoreImportProps) {
  const [showModal, setShowModal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadTemplate() {
    setDownloading(true);
    try {
      const XLSX = await import("xlsx");
      const result = await getClassStudents(classId);
      if (!result.success) {
        alert("message" in result ? result.message : "获取班级学生失败");
        return;
      }

      const headers = [
        "班级", "姓名", "手机号",
        "语文", "数学", "英语", "日语", "俄语",
        "历史", "物理", "地理", "政治", "生物", "化学",
        "备注",
      ];

      const tipRow = [
        "", "", "",
        "满分150", "满分150", "满分150", "满分150", "满分150",
        "满分100", "满分100", "满分100", "满分100", "满分100", "满分100",
        "",
      ];

      const dataRows = result.students.map((s: any) => [
        className, s.name, s.phone,
        "", "", "", "", "",
        "", "", "", "", "", "",
        "",
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, tipRow, ...dataRows]);
      ws["!cols"] = [
        { wch: 10 }, { wch: 10 }, { wch: 14 },
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
      a.download = `${className}_成绩导入模板.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("下载模板失败：" + (e?.message || "未知错误"));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleDownloadTemplate}
        disabled={downloading}
        className="inline-flex h-10 items-center gap-2 rounded border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        <Download size={16} />
        下载本班成绩模板
      </button>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className="inline-flex h-10 items-center gap-2 rounded border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <Upload size={16} />
        导入本班成绩
      </button>
      {showModal && (
        <ClassScoreImportModal
          classId={classId}
          className={className}
          grade={grade}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

// ====== 弹窗组件 ======

function ClassScoreImportModal({ classId, className, grade, onClose }: ClassScoreImportProps & { onClose: () => void }) {
  const [step, setStep] = useState<"select" | "upload" | "preview" | "result">("select");
  const [examId, setExamId] = useState<number | null>(null);
  const [examName, setExamName] = useState("");
  const [exams, setExams] = useState<Array<{ id: number; name: string; examDate: string; grade: string; type: string }>>([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [showNewExam, setShowNewExam] = useState(false);
  const [newExamName, setNewExamName] = useState("");
  const [newExamDate, setNewExamDate] = useState("");
  const [newExamType, setNewExamType] = useState("月考");
  const [newExamRemark, setNewExamRemark] = useState("");
  const [creatingExam, setCreatingExam] = useState(false);
  const [previewResult, setPreviewResult] = useState<ScorePreviewResult | null>(null);
  const [importResult, setImportResult] = useState<ScoreImportResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadExams() {
    setLoadingExams(true);
    try {
      const list = await getExams(grade);
      setExams(list);
    } catch {
      setExams([]);
    } finally {
      setLoadingExams(false);
    }
  }

  function handleSelectExam(eid: number, ename: string) {
    setExamId(eid);
    setExamName(ename);
    setStep("upload");
  }

  async function handleCreateExam() {
    if (!newExamName.trim() || !newExamDate.trim()) return;
    setCreatingExam(true);
    try {
      const result = await createExamQuick({
        name: newExamName.trim(),
        examDate: newExamDate,
        type: newExamType,
        grade,
        remark: newExamRemark.trim() || undefined,
      });
      if (result.success && "id" in result) {
        setExamId(result.id);
        setExamName(result.name);
        setShowNewExam(false);
        setStep("upload");
        const list = await getExams(grade);
        setExams(list);
      } else {
        setError("message" in result ? result.message : "创建考试失败");
      }
    } catch (e: any) {
      setError("创建考试失败：" + (e?.message || "未知错误"));
    } finally {
      setCreatingExam(false);
    }
  }

  async function handleDownloadTemplate() {
    try {
      const XLSX = await import("xlsx");
      const result = await getClassStudents(classId);
      if (!result.success) {
        setError("message" in result ? result.message : "获取班级学生失败");
        return;
      }

      const headers = [
        "班级", "姓名", "手机号",
        "语文", "数学", "英语", "日语", "俄语",
        "历史", "物理", "地理", "政治", "生物", "化学",
        "备注",
      ];

      const tipRow = [
        "", "", "",
        "满分150", "满分150", "满分150", "满分150", "满分150",
        "满分100", "满分100", "满分100", "满分100", "满分100", "满分100",
        "",
      ];

      const dataRows = result.students.map((s: any) => [
        className, s.name, s.phone,
        "", "", "", "", "",
        "", "", "", "", "", "",
        "",
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, tipRow, ...dataRows]);
      ws["!cols"] = [
        { wch: 10 }, { wch: 10 }, { wch: 14 },
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
      a.download = `${className}_成绩导入模板.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError("下载模板失败：" + (e?.message || "未知错误"));
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !examId) return;

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

      if (colMap.name === -1) {
        setError("Excel 模板缺少「姓名」列，请使用标准模板");
        return;
      }

      const rows: ScoreImportRow[] = [];
      for (let i = 1; i < jsonData.length; i++) {
        const raw = jsonData[i];
        if (!raw || raw.length === 0) continue;
        const hasData = raw.some((cell: any) => cell !== "" && cell !== null && cell !== undefined);
        if (!hasData) continue;
        const firstVal = String(raw[0] || "").trim();
        if (!firstVal && String(raw[colMap.chinese >= 0 ? colMap.chinese : 3] || "").includes("满分")) continue;

        const row: ScoreImportRow = {
          rowNo: i + 1,
          className: colMap.className >= 0 ? String(raw[colMap.className] || "").trim() : "",
          name: colMap.name >= 0 ? String(raw[colMap.name] || "").trim() : "",
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

        if (!row.name && SUBJECT_ORDER.every((s) => row[s] === null)) continue;
        rows.push(row);
      }

      if (rows.length === 0) {
        setError("解析后没有有效数据行");
        return;
      }

      startTransition(async () => {
        try {
          const result = await validateScoreImport(classId, examId, rows);
          setPreviewResult(result);
          setStep("preview");
        } catch (e: any) {
          setError("校验失败：" + (e?.message || "未知错误"));
        }
      });
    } catch (e: any) {
      setError("解析 Excel 文件失败：" + (e?.message || "未知错误"));
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleConfirmImport() {
    if (!previewResult || !examId) return;
    startTransition(async () => {
      try {
        const importableRows = previewResult.rows.filter((r) => r.status === "ok" || r.status === "warning");
        const result = await confirmScoreImport(classId, examId, importableRows);
        setImportResult(result);
        setStep("result");
      } catch (e: any) {
        setError("导入失败：" + (e?.message || "未知错误"));
      }
    });
  }

  function handleReset() {
    setStep("select");
    setPreviewResult(null);
    setImportResult(null);
    setError(null);
    setExamId(null);
    setExamName("");
  }

  function handleBackToUpload() {
    setStep("upload");
    setPreviewResult(null);
    setImportResult(null);
    setError(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 pt-10" onClick={onClose}>
      <div className="relative w-full max-w-4xl rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* 弹窗头部 */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">导入本班成绩 — {className}</h3>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* 弹窗内容 */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: 选择考试 */}
          {step === "select" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">请选择考试批次，或新建考试：</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={loadExams}
                  className="inline-flex h-10 items-center gap-2 rounded border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  加载考试列表
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewExam(true)}
                  className="inline-flex h-10 items-center gap-2 rounded bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
                >
                  <Plus size={16} />
                  新建考试
                </button>
              </div>

              {loadingExams && <div className="text-sm text-slate-500">加载中...</div>}
              {exams.length > 0 && (
                <div className="max-h-[300px] overflow-y-auto rounded border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                      <tr>
                        <th className="px-3 py-2">考试名称</th>
                        <th className="px-3 py-2">日期</th>
                        <th className="px-3 py-2">类型</th>
                        <th className="px-3 py-2 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {exams.map((exam) => (
                        <tr key={exam.id}>
                          <td className="px-3 py-2 font-medium">{exam.name}</td>
                          <td className="px-3 py-2">{exam.examDate}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{exam.type}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleSelectExam(exam.id, exam.name)}
                              className="rounded bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700"
                            >
                              选择
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {showNewExam && (
                <div className="rounded border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="text-sm font-medium text-slate-900">新建考试</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">考试名称 *</label>
                      <input
                        type="text"
                        value={newExamName}
                        onChange={(e) => setNewExamName(e.target.value)}
                        placeholder="三月月考"
                        className="h-9 w-full rounded border border-slate-300 px-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">考试日期 *</label>
                      <input
                        type="date"
                        value={newExamDate}
                        onChange={(e) => setNewExamDate(e.target.value)}
                        className="h-9 w-full rounded border border-slate-300 px-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">考试类型</label>
                      <select
                        value={newExamType}
                        onChange={(e) => setNewExamType(e.target.value)}
                        className="h-9 w-full rounded border border-slate-300 px-3 text-sm"
                      >
                        <option value="月考">月考</option>
                        <option value="模拟考">模拟考</option>
                        <option value="周测">周测</option>
                        <option value="限时训练">限时训练</option>
                        <option value="日常测验">日常测验</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-600">备注</label>
                      <input
                        type="text"
                        value={newExamRemark}
                        onChange={(e) => setNewExamRemark(e.target.value)}
                        placeholder="选填"
                        className="h-9 w-full rounded border border-slate-300 px-3 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateExam}
                      disabled={creatingExam || !newExamName.trim() || !newExamDate}
                      className="inline-flex h-9 items-center gap-1 rounded bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                    >
                      {creatingExam ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                      创建并选择
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewExam(false)}
                      className="inline-flex h-9 items-center rounded border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      取消
                    </button>
                  </div>
                  <div className="text-xs text-slate-500">年级自动设为当前班级年级：{grade}</div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: 上传 */}
          {step === "upload" && (
            <div className="space-y-4">
              <div className="rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                考试批次：<strong>{examName}</strong>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex h-10 items-center gap-2 rounded border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Download size={16} />
                  下载本班成绩模板
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
                <span className="text-xs text-slate-500">模板自动带出本班学生名单，填写成绩后上传</span>
              </div>
              <button
                type="button"
                onClick={() => { setStep("select"); setExamId(null); setExamName(""); }}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                ← 重新选择考试
              </button>
            </div>
          )}

          {/* Step 3: 预览 */}
          {step === "preview" && previewResult && (
            <div className="space-y-4">
              <div className="rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                考试批次：<strong>{examName}</strong> | 重复成绩将覆盖已有成绩
              </div>

              <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
                <StatCard label="Excel总行数" value={previewResult.totalRows} color="slate" />
                <StatCard label="匹配学生" value={previewResult.matchedStudents} color="blue" />
                <StatCard label="可导入学生" value={previewResult.importableStudents} color="green" />
                <StatCard label="可导入成绩" value={previewResult.importableScores} color="green" />
                <StatCard label="错误行" value={previewResult.errorRows} color="red" />
                <StatCard label="警告行" value={previewResult.warningRows} color="amber" />
                <StatCard label="重复成绩" value={previewResult.duplicateScores} color="orange" />
              </div>

              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500 sticky top-0">
                    <tr>
                      <th className="px-2 py-2">行号</th>
                      <th className="px-2 py-2">班级</th>
                      <th className="px-2 py-2">姓名</th>
                      <th className="px-2 py-2">手机号</th>
                      <th className="px-2 py-2">语文</th>
                      <th className="px-2 py-2">数学</th>
                      <th className="px-2 py-2">英语</th>
                      <th className="px-2 py-2">日语</th>
                      <th className="px-2 py-2">俄语</th>
                      <th className="px-2 py-2">历史</th>
                      <th className="px-2 py-2">物理</th>
                      <th className="px-2 py-2">地理</th>
                      <th className="px-2 py-2">政治</th>
                      <th className="px-2 py-2">生物</th>
                      <th className="px-2 py-2">化学</th>
                      <th className="px-2 py-2">状态</th>
                      <th className="px-2 py-2">错误原因</th>
                      <th className="px-2 py-2">警告提示</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewResult.rows.map((row, idx) => (
                      <tr key={idx} className={statusBg(row.status)}>
                        <td className="px-2 py-2">{row.rowNo}</td>
                        <td className="px-2 py-2">{row.className}</td>
                        <td className="px-2 py-2 font-medium">
                          {row.matchedStudentName && row.matchedStudentName !== row.name
                            ? `${row.name}→${row.matchedStudentName}`
                            : row.name}
                        </td>
                        <td className="px-2 py-2">{row.phone || "—"}</td>
                        <td className="px-2 py-2">{fmtScore(row.chinese)}</td>
                        <td className="px-2 py-2">{fmtScore(row.math)}</td>
                        <td className="px-2 py-2">{fmtScore(row.english)}</td>
                        <td className="px-2 py-2">{fmtScore(row.japanese)}</td>
                        <td className="px-2 py-2">{fmtScore(row.russian)}</td>
                        <td className="px-2 py-2">{fmtScore(row.history)}</td>
                        <td className="px-2 py-2">{fmtScore(row.physics)}</td>
                        <td className="px-2 py-2">{fmtScore(row.geography)}</td>
                        <td className="px-2 py-2">{fmtScore(row.politics)}</td>
                        <td className="px-2 py-2">{fmtScore(row.biology)}</td>
                        <td className="px-2 py-2">{fmtScore(row.chemistry)}</td>
                        <td className="px-2 py-2"><RowStatusBadge status={row.status} /></td>
                        <td className="px-2 py-2 text-xs text-red-600">{row.errorReason}</td>
                        <td className="px-2 py-2 text-xs text-amber-600">{row.warningReason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={isPending || previewResult.importableStudents === 0}
                  className="inline-flex h-10 items-center gap-2 rounded bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  确认导入（{previewResult.importableStudents} 名学生，{previewResult.importableScores} 条成绩）
                </button>
                <button
                  type="button"
                  onClick={handleBackToUpload}
                  disabled={isPending}
                  className="inline-flex h-10 items-center gap-2 rounded border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  返回修改
                </button>
              </div>
            </div>
          )}

          {/* Step 4: 导入结果 */}
          {step === "result" && importResult && (
            <div className="space-y-4">
              <div className={`rounded border px-4 py-3 text-sm ${importResult.success ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>
                <div className="flex items-start gap-2">
                  {importResult.success ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
                  <div>
                    <div className="font-medium">{importResult.message}</div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
                      <div>导入学生：<strong>{importResult.importedStudents}</strong></div>
                      <div>新增成绩：<strong>{importResult.importedScores}</strong></div>
                      <div>覆盖成绩：<strong>{importResult.updatedScores}</strong></div>
                      <div>跳过错误：<strong>{importResult.skippedErrors}</strong></div>
                      <div>警告行数：<strong>{importResult.warningRows}</strong></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex h-10 items-center gap-2 rounded border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  继续导入
                </button>
              </div>
            </div>
          )}

          {isPending && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              正在处理...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ====== 保留旧组件名兼容（内部改为按钮+弹窗） ======

export function ClassScoreImportPanel(props: ClassScoreImportProps) {
  return <ClassScoreImportButtons {...props} />;
}

// ====== 辅助组件 ======

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    slate: "bg-slate-50 text-slate-900",
    green: "bg-green-50 text-green-800",
    amber: "bg-amber-50 text-amber-800",
    red: "bg-red-50 text-red-800",
    blue: "bg-blue-50 text-blue-800",
    orange: "bg-orange-50 text-orange-800",
  };
  return (
    <div className={`rounded px-3 py-2 ${colorMap[color] || colorMap.slate}`}>
      <div className="text-xl font-bold">{value}</div>
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
  if (status === "warning") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        <AlertTriangle size={12} /> 警告
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
  if (status === "warning") return "bg-amber-50/50";
  return "";
}

function fmtScore(val: number | null): string {
  if (val === null || val === undefined) return "";
  return String(val);
}

// ====== 列映射 ======

function buildColumnMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {
    className: -1, name: -1, phone: -1,
    chinese: -1, math: -1, english: -1, japanese: -1, russian: -1,
    physics: -1, history: -1, geography: -1, politics: -1, biology: -1, chemistry: -1,
    remark: -1,
  };

  const aliases: Record<string, string[]> = {
    className: ["班级", "班", "班级名称", "class"],
    name: ["姓名", "学生姓名", "名字", "学生", "name", "student_name"],
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
