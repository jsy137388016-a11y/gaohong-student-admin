"use client";

import { useState, useRef, useTransition } from "react";
import { ChevronDown, ShieldAlert, CalendarCheck, Clock, BookOpen, MessageSquareText, AlertTriangle, X } from "lucide-react";

type Student = {
  id: number;
  name: string;
  grade: string;
  classRoom?: { id: number; name: string; grade: string } | null;
};

type QuickActionProps = {
  student: Student;
  userName: string;
  className: string;
  grade: string;
};

// ==================== 下拉菜单 ====================
export function QuickActionButton({ student, userName, className, grade }: QuickActionProps) {
  const [open, setOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const actions = [
    { key: "discipline", label: "违纪登记", icon: ShieldAlert, color: "text-orange-600" },
    { key: "attendance", label: "考勤登记", icon: CalendarCheck, color: "text-blue-600" },
    { key: "leave", label: "请假登记", icon: Clock, color: "text-teal-600" },
    { key: "score", label: "成绩登记", icon: BookOpen, color: "text-indigo-600" },
    { key: "communication", label: "沟通记录", icon: MessageSquareText, color: "text-green-600" },
    { key: "warning", label: "口碑预警", icon: AlertTriangle, color: "text-red-600" },
  ];

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          className="inline-flex h-8 items-center gap-1 rounded border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          更多操作
          <ChevronDown size={14} />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div className="absolute right-0 z-40 mt-1 w-40 rounded border border-slate-200 bg-white py-1 shadow-lg">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.key}
                    onClick={() => { setOpen(false); setActiveModal(action.key); }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 ${action.color}`}
                  >
                    <Icon size={15} />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {activeModal === "discipline" && (
        <DisciplineModal
          student={student}
          userName={userName}
          className={className}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === "attendance" && (
        <AttendanceModal
          student={student}
          userName={userName}
          className={className}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === "leave" && (
        <LeaveModal
          student={student}
          userName={userName}
          className={className}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === "score" && (
        <ScoreModal
          student={student}
          userName={userName}
          className={className}
          grade={grade}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === "communication" && (
        <CommunicationModal
          student={student}
          userName={userName}
          className={className}
          onClose={() => setActiveModal(null)}
        />
      )}
      {activeModal === "warning" && (
        <WarningModal
          student={student}
          userName={userName}
          className={className}
          onClose={() => setActiveModal(null)}
        />
      )}
    </>
  );
}

// ==================== Modal 通用壳 ====================
function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 pt-10 pb-10">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const inputClass = "h-10 w-full rounded border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100";
const textareaClass = "min-h-20 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
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

function AutoField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <div className="h-10 w-full rounded border border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">{value}</div>
    </label>
  );
}

function SubmitButton({ pending, children = "提交" }: { pending: boolean; children?: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center gap-2 rounded bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
    >
      {pending ? "提交中..." : children}
    </button>
  );
}

// ==================== 违纪登记弹窗 ====================
function DisciplineModal({ student, userName, className, onClose }: { student: Student; userName: string; className: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const now = new Date().toISOString().slice(0, 16);

  function handleSubmit(fd: FormData) {
    startTransition(async () => {
      const { quickCreateDiscipline } = await import("@/app/classes/quick-actions");
      const res = await quickCreateDiscipline(fd);
      setResult(res);
      if (res.success) setTimeout(onClose, 1500);
    });
  }

  return (
    <ModalShell title="违纪登记" onClose={onClose}>
      <form action={handleSubmit} className="grid gap-4">
        <input type="hidden" name="studentId" value={student.id} />
        <div className="grid grid-cols-2 gap-3">
          <AutoField label="学生姓名" value={student.name} />
          <AutoField label="班级" value={className} />
        </div>
        <Field label="违纪类型" required>
          <select name="violationType" required className={inputClass} defaultValue="">
            <option value="" disabled>请选择</option>
            <option value="手机违规">手机违规</option>
            <option value="迟到">迟到</option>
            <option value="寝室纪律">寝室纪律</option>
            <option value="课堂违纪">课堂违纪</option>
            <option value="打架">打架</option>
            <option value="吸烟">吸烟</option>
            <option value="其他">其他</option>
          </select>
        </Field>
        <Field label="违纪时间" required>
          <input type="datetime-local" name="recordedAt" required defaultValue={now} className={inputClass} />
        </Field>
        <Field label="违纪描述" required>
          <textarea name="description" required className={textareaClass} placeholder="请描述违纪情况" />
        </Field>
        <Field label="处理结果" required>
          <textarea name="result" required className={textareaClass} placeholder="处理方式" />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="parentNotified" className="h-4 w-4 rounded border-slate-300 text-brand-600" />
          已通知家长
        </label>
        <Field label="跟进人" required>
          <input name="follower" required defaultValue={userName} className={inputClass} />
        </Field>
        <Field label="备注">
          <textarea name="remark" className={textareaClass} />
        </Field>
        {result && (
          <div className={`rounded p-3 text-sm ${result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {result.message}
          </div>
        )}
        <SubmitButton pending={pending}>提交违纪记录</SubmitButton>
      </form>
    </ModalShell>
  );
}

// ==================== 考勤登记弹窗 ====================
function AttendanceModal({ student, userName, className, onClose }: { student: Student; userName: string; className: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  function handleSubmit(fd: FormData) {
    startTransition(async () => {
      const { quickCreateAttendance } = await import("@/app/classes/quick-actions");
      const res = await quickCreateAttendance(fd);
      setResult(res);
      if (res.success) setTimeout(onClose, 1500);
    });
  }

  return (
    <ModalShell title="考勤登记" onClose={onClose}>
      <form action={handleSubmit} className="grid gap-4">
        <input type="hidden" name="studentId" value={student.id} />
        <div className="grid grid-cols-2 gap-3">
          <AutoField label="学生姓名" value={student.name} />
          <AutoField label="班级" value={className} />
        </div>
        <Field label="日期" required>
          <input type="date" name="date" required defaultValue={today} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="考勤类型" required>
            <select name="type" required className={inputClass} defaultValue="">
              <option value="" disabled>请选择</option>
              <option value="normal">正常</option>
              <option value="late">迟到</option>
              <option value="early_leave">早退</option>
              <option value="absent">旷课</option>
              <option value="dorm_absent">未归寝</option>
            </select>
          </Field>
          <Field label="时间段" required>
            <select name="period" required className={inputClass} defaultValue="">
              <option value="" disabled>请选择</option>
              <option value="早读">早读</option>
              <option value="上午">上午</option>
              <option value="下午">下午</option>
              <option value="晚自习">晚自习</option>
              <option value="宿舍归寝">宿舍归寝</option>
            </select>
          </Field>
        </div>
        <Field label="说明">
          <textarea name="description" className={textareaClass} placeholder="考勤说明" />
        </Field>
        <Field label="记录人" required>
          <input name="recorder" required defaultValue={userName} className={inputClass} />
        </Field>
        {result && (
          <div className={`rounded p-3 text-sm ${result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {result.message}
          </div>
        )}
        <SubmitButton pending={pending}>提交考勤记录</SubmitButton>
      </form>
    </ModalShell>
  );
}

// ==================== 请假登记弹窗 ====================
function LeaveModal({ student, userName, className, onClose }: { student: Student; userName: string; className: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const now = new Date().toISOString().slice(0, 16);

  function handleSubmit(fd: FormData) {
    startTransition(async () => {
      const { quickCreateLeave } = await import("@/app/classes/quick-actions");
      const res = await quickCreateLeave(fd);
      setResult(res);
      if (res.success) setTimeout(onClose, 1500);
    });
  }

  return (
    <ModalShell title="请假登记" onClose={onClose}>
      <form action={handleSubmit} className="grid gap-4">
        <input type="hidden" name="studentId" value={student.id} />
        <div className="grid grid-cols-2 gap-3">
          <AutoField label="学生姓名" value={student.name} />
          <AutoField label="班级" value={className} />
        </div>
        <Field label="请假类型" required>
          <select name="leaveType" required className={inputClass} defaultValue="">
            <option value="" disabled>请选择</option>
            <option value="事假">事假</option>
            <option value="病假">病假</option>
            <option value="艺考外出">艺考外出</option>
            <option value="回家">回家</option>
            <option value="其他">其他</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="开始时间" required>
            <input type="datetime-local" name="leaveStart" required defaultValue={now} className={inputClass} />
          </Field>
          <Field label="结束时间" required>
            <input type="datetime-local" name="leaveEnd" required className={inputClass} />
          </Field>
        </div>
        <Field label="请假原因">
          <textarea name="leaveReason" className={textareaClass} placeholder="请输入请假原因" />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="parentConfirmed" className="h-4 w-4 rounded border-slate-300 text-brand-600" />
          家长已确认
        </label>
        <div className="grid grid-cols-2 gap-3">
          <Field label="审批状态">
            <select name="approvalStatus" className={inputClass} defaultValue="pending">
              <option value="pending">待确认</option>
              <option value="approved">已批准</option>
              <option value="rejected">已驳回</option>
            </select>
          </Field>
          <Field label="审批人">
            <input name="approver" className={inputClass} placeholder="审批人姓名" />
          </Field>
        </div>
        <Field label="记录人" required>
          <input name="recorder" required defaultValue={userName} className={inputClass} />
        </Field>
        {result && (
          <div className={`rounded p-3 text-sm ${result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {result.message}
          </div>
        )}
        <SubmitButton pending={pending}>提交请假记录</SubmitButton>
      </form>
    </ModalShell>
  );
}

// ==================== 成绩登记弹窗 ====================
function ScoreModal({ student, userName, className, grade, onClose }: { student: Student; userName: string; className: string; grade: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  function handleSubmit(fd: FormData) {
    startTransition(async () => {
      const { quickCreateScore } = await import("@/app/classes/quick-actions");
      const res = await quickCreateScore(fd);
      setResult(res);
      if (res.success) setTimeout(onClose, 1500);
    });
  }

  return (
    <ModalShell title="成绩登记" onClose={onClose}>
      <form action={handleSubmit} className="grid gap-4">
        <input type="hidden" name="studentId" value={student.id} />
        <input type="hidden" name="grade" value={grade} />
        <div className="grid grid-cols-2 gap-3">
          <AutoField label="学生姓名" value={student.name} />
          <AutoField label="班级" value={className} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="考试名称" required>
            <input name="examName" required className={inputClass} placeholder="如：三月月考" />
          </Field>
          <Field label="考试日期" required>
            <input type="date" name="examDate" required defaultValue={today} className={inputClass} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="语文" required>
            <input type="number" name="chinese" required min="0" defaultValue="0" className={inputClass} />
          </Field>
          <Field label="数学" required>
            <input type="number" name="math" required min="0" defaultValue="0" className={inputClass} />
          </Field>
          <Field label="英语" required>
            <input type="number" name="english" required min="0" defaultValue="0" className={inputClass} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="政治" required>
            <input type="number" name="politics" required min="0" defaultValue="0" className={inputClass} />
          </Field>
          <Field label="历史" required>
            <input type="number" name="history" required min="0" defaultValue="0" className={inputClass} />
          </Field>
          <Field label="地理" required>
            <input type="number" name="geography" required min="0" defaultValue="0" className={inputClass} />
          </Field>
        </div>
        <Field label="备注">
          <textarea name="remark" className={textareaClass} />
        </Field>
        {result && (
          <div className={`rounded p-3 text-sm ${result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {result.message}
          </div>
        )}
        <SubmitButton pending={pending}>提交成绩</SubmitButton>
      </form>
    </ModalShell>
  );
}

// ==================== 沟通记录弹窗 ====================
function CommunicationModal({ student, userName, className, onClose }: { student: Student; userName: string; className: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const now = new Date().toISOString().slice(0, 16);

  function handleSubmit(fd: FormData) {
    startTransition(async () => {
      const { quickCreateCommunication } = await import("@/app/classes/quick-actions");
      const res = await quickCreateCommunication(fd);
      setResult(res);
      if (res.success) setTimeout(onClose, 1500);
    });
  }

  return (
    <ModalShell title="沟通记录" onClose={onClose}>
      <form action={handleSubmit} className="grid gap-4">
        <input type="hidden" name="studentId" value={student.id} />
        <div className="grid grid-cols-2 gap-3">
          <AutoField label="学生姓名" value={student.name} />
          <AutoField label="班级" value={className} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="沟通对象" required>
            <select name="target" required className={inputClass} defaultValue="">
              <option value="" disabled>请选择</option>
              <option value="父亲">父亲</option>
              <option value="母亲">母亲</option>
              <option value="学生本人">学生本人</option>
              <option value="其他监护人">其他监护人</option>
            </select>
          </Field>
          <Field label="沟通方式" required>
            <select name="method" required className={inputClass} defaultValue="">
              <option value="" disabled>请选择</option>
              <option value="phone">电话</option>
              <option value="wechat">微信</option>
              <option value="onsite">面谈</option>
              <option value="message">短信/留言</option>
              <option value="other">其他</option>
            </select>
          </Field>
        </div>
        <Field label="沟通时间" required>
          <input type="datetime-local" name="contactedAt" required defaultValue={now} className={inputClass} />
        </Field>
        <Field label="沟通内容" required>
          <textarea name="content" required className={textareaClass} placeholder="沟通的主要内容" />
        </Field>
        <Field label="家长反馈">
          <textarea name="parentFeedback" className={textareaClass} placeholder="家长的主要反馈" />
        </Field>
        <Field label="后续跟进事项">
          <textarea name="followUp" className={textareaClass} placeholder="需要后续跟进的事项" />
        </Field>
        <Field label="沟通人" required>
          <input name="communicator" required defaultValue={userName} className={inputClass} />
        </Field>
        <Field label="备注">
          <textarea name="remark" className={textareaClass} />
        </Field>
        {result && (
          <div className={`rounded p-3 text-sm ${result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {result.message}
          </div>
        )}
        <SubmitButton pending={pending}>提交沟通记录</SubmitButton>
      </form>
    </ModalShell>
  );
}

// ==================== 口碑预警弹窗 ====================
function WarningModal({ student, userName, className, onClose }: { student: Student; userName: string; className: string; onClose: () => void }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  function handleSubmit(fd: FormData) {
    startTransition(async () => {
      const { quickCreateWarning } = await import("@/app/classes/quick-actions");
      const res = await quickCreateWarning(fd);
      setResult(res);
      if (res.success) setTimeout(onClose, 1500);
    });
  }

  return (
    <ModalShell title="口碑预警" onClose={onClose}>
      <form action={handleSubmit} className="grid gap-4">
        <input type="hidden" name="studentId" value={student.id} />
        <div className="grid grid-cols-2 gap-3">
          <AutoField label="学生姓名" value={student.name} />
          <AutoField label="班级" value={className} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="预警等级" required>
            <select name="level" required className={inputClass} defaultValue="">
              <option value="" disabled>请选择</option>
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
              <option value="urgent">紧急</option>
            </select>
          </Field>
          <Field label="预警类型" required>
            <select name="warningType" required className={inputClass} defaultValue="">
              <option value="" disabled>请选择</option>
              <option value="学生情绪异常">学生情绪异常</option>
              <option value="家长不满意">家长不满意</option>
              <option value="退费风险">退费风险</option>
              <option value="学习状态差">学习状态差</option>
              <option value="纪律反复">纪律反复</option>
              <option value="考勤异常">考勤异常</option>
              <option value="成绩明显下滑">成绩明显下滑</option>
              <option value="其他">其他</option>
            </select>
          </Field>
        </div>
        <Field label="预警原因" required>
          <textarea name="reason" required className={textareaClass} placeholder="请描述预警原因" />
        </Field>
        <Field label="当前处理措施">
          <textarea name="currentMeasure" className={textareaClass} placeholder="正在采取的措施" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="负责人">
            <input name="responsiblePerson" defaultValue={userName} className={inputClass} />
          </Field>
          <Field label="下次跟进时间">
            <input type="datetime-local" name="nextFollowUpAt" className={inputClass} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="状态">
            <select name="status" className={inputClass} defaultValue="pending">
              <option value="pending">待处理</option>
              <option value="processing">处理中</option>
              <option value="resolved">已解决</option>
            </select>
          </Field>
        </div>
        <Field label="备注">
          <textarea name="remark" className={textareaClass} />
        </Field>
        {result && (
          <div className={`rounded p-3 text-sm ${result.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
            {result.message}
          </div>
        )}
        <SubmitButton pending={pending}>提交预警</SubmitButton>
      </form>
    </ModalShell>
  );
}
