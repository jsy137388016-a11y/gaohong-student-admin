import Link from "next/link";
import { Edit3 } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  ConfirmButton,
  EmptyText,
  FilterBar,
  inputClass,
  menuItemClass,
  MoreActions,
  PageTitle,
  Panel,
  SearchButton,
  TableShell,
} from "@/components/ui";
import { StudentImportPanel } from "@/components/student-import";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { boardingLabels, displayValue, firstValue, genderLabels } from "@/lib/format";
import { createStudent, deleteStudent } from "./actions";
import { StudentCreateModal } from "./StudentCreateModal";
import { Pagination } from "./Pagination";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

// 强制动态渲染，避免 Next.js 预渲染时因 cookies() 报错
export const dynamic = "force-dynamic";

export default async function StudentsPage({ searchParams }: PageProps) {
  // requireUser() 内部 redirect() 抛出的 NEXT_REDIRECT 由 Next.js 路由层捕获，
  // 不要在这里 try-catch，否则 redirect 会变成 Application Error
  const user = await requireUser();

  const params = (await searchParams) || {};
  const q = firstValue(params.q) || "";
  const classId = firstValue(params.classId) || "";
  const isHeadTeacher = user.role === "head_teacher";
  const isUnassignedFilter = classId === "unassigned";

  // 分页参数
  const page = Math.max(1, Number(firstValue(params.page)) || 1);
  const pageSize = Number(firstValue(params.pageSize)) || 50;
  const validPageSizes = [20, 50, 100];
  const actualPageSize = validPageSizes.includes(pageSize) ? pageSize : 50;

  let classes: any[] = [];
  let students: any[] = [];
  let totalCount: number = 0;
  let totalPages: number = 0;
  try {
    // 只查班级列表，不通过 include 查 classRoom（避免 D1 关联问题）
    classes = await prisma.classRoom.findMany({
      where: {
        status: "active",
        ...(isHeadTeacher ? { headTeacher: user.name } : {})
      },
      orderBy: [{ grade: "desc" }, { name: "asc" }]
    });
  } catch (e: any) {
    console.error("[/students] classRoom findMany failed:", e?.message ?? e);
    classes = [];
  }

  try {
    const where: any = {
      AND: [
        { status: "active" },
        q
          ? {
              OR: [
                { name: { contains: q } },
                { phone: { contains: q } },
                { parentName: { contains: q } },
                { parentPhone: { contains: q } }
              ]
            }
          : {},
        isUnassignedFilter ? { classId: null } : classId ? { classId: Number(classId) } : {}
      ]
    };
    if (isHeadTeacher) {
      where.AND.push({ classRoom: { headTeacher: user.name } });
    }
    // 分页查询：先查总数，再查当前页数据
    const [count, studentsList] = await Promise.all([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * actualPageSize,
        take: actualPageSize
      })
    ]);
    students = studentsList;
    totalCount = count;
    totalPages = Math.ceil(count / actualPageSize);
  } catch (e: any) {
    console.error("[/students] student findMany failed:", e?.message ?? e);
    students = [];
  }

  // 建立 classId → className 映射（避免直接 include classRoom）
  const classMap = new Map<number, { grade: string; name: string }>();
  for (const c of classes) {
    classMap.set(c.id, { grade: c.grade, name: c.name });
  }

  // 构建分页链接
  function buildPageUrl(newPage: number, newPageSize?: number): string {
    const ps = new URLSearchParams();
    if (q) ps.set("q", q);
    if (classId) ps.set("classId", classId);
    ps.set("page", String(newPage));
    ps.set("pageSize", String(newPageSize || actualPageSize));
    return `/students?${ps.toString()}`;
  }

  return (
    <DashboardLayout user={user}>
      <PageTitle
        title="学生管理"
        description={isHeadTeacher ? "班主任账号仅显示自己担任班主任的班级学生。" : "维护学生档案，支持搜索、按班级筛选、新增、编辑和删除。"}
      />

      {/* 查询筛选区域 */}
      <div className="mb-6 grid gap-6">
        <Panel title="查询筛选">
          <FilterBar>
          <form className="grid gap-3 md:grid-cols-[1fr_220px_auto_auto] md:items-center" action="/students">
            <input name="q" defaultValue={q} placeholder="搜索姓名、手机、家长" className={inputClass} />
            <select name="classId" defaultValue={classId} className={inputClass}>
              <option value="">全部班级</option>
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.grade} {item.name}
                </option>
              ))}
              {!isHeadTeacher ? <option value="unassigned">暂不分班</option> : null}
            </select>
            <SearchButton />
            <StudentCreateModal classes={classes} />
          </form>
          </FilterBar>
          <StudentImportPanel />
        </Panel>
      </div>

      {/* 学生总数提示 */}
      <div className="mb-3 text-sm text-slate-500">
        共 <span className="font-semibold text-slate-900">{totalCount ?? 0}</span> 条记录
        {totalCount && totalCount > actualPageSize && <span>，当前第 {page} 页</span>}
      </div>

      {students.length === 0 ? (
        <EmptyText />
      ) : (
        <>
          <TableShell>
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">姓名</th>
                <th className="px-5 py-3">性别</th>
                <th className="px-5 py-3">班级</th>
                <th className="px-5 py-3">电话</th>
                <th className="px-5 py-3">家长</th>
                <th className="px-5 py-3">住宿</th>
                <th className="px-5 py-3">专业</th>
                <th className="px-5 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {students.map((student) => {
                const classInfo = student.classId != null ? classMap.get(student.classId) : null;
                const classDisplay = classInfo ? `${classInfo.grade} ${classInfo.name}` : "暂未分班";
                return (
                  <tr key={student.id}>
                    <td className="px-5 py-3 font-medium text-slate-950">
                      <Link href={`/students/${student.id}`} className="hover:text-brand-700 hover:underline">
                        {student.name}
                      </Link>
                      {student.isFocus ? (
                        <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">重点</span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3">{genderLabels[student.gender] ?? student.gender}</td>
                    <td className="px-5 py-3">{classDisplay}</td>
                    <td className="px-5 py-3">{displayValue(student.phone)}</td>
                    <td className="px-5 py-3">{student.parentName} {student.parentPhone}</td>
                    <td className="px-5 py-3">{boardingLabels[student.boardingStatus] ?? student.boardingStatus}</td>
                    <td className="px-5 py-3">{displayValue(student.artMajor)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end">
                        <MoreActions>
                          <Link className={menuItemClass} href={`/students/${student.id}/edit`}>
                            <Edit3 size={14} />
                            编辑
                          </Link>
                        <form action={deleteStudent.bind(null, student.id)}>
                          <ConfirmButton
                            label="删除"
                            confirmText="确认删除该学生吗？系统将改为软删除，不会物理删除历史数据。"
                          />
                        </form>
                        </MoreActions>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableShell>

          {/* 分页器 */}
          {(totalCount ?? 0) > actualPageSize && (
            <Pagination
              page={page}
              pageSize={actualPageSize}
              totalPages={totalPages}
              totalCount={totalCount}
              searchQuery={q}
              classId={classId}
            />
          )}
        </>
      )}
    </DashboardLayout>
  );
}
