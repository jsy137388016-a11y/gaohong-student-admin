"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { inputClass } from "@/components/ui";

type Student = {
  id: number;
  name: string;
  phone?: string | null;
  parentPhone?: string;
  classRoom?: { name: string } | null;
};

export function StudentSearchSelect({
  students,
  name = "studentId",
  required = false,
  placeholder = "搜索学生姓名/手机号/班级",
}: {
  students: Student[];
  name?: string;
  required?: boolean;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return students.slice(0, 25);
    return students
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.phone && s.phone.includes(q)) ||
          (s.parentPhone && s.parentPhone.includes(q)) ||
          (s.classRoom?.name && s.classRoom.name.toLowerCase().includes(q))
      )
      .slice(0, 25);
  }, [students, query]);

  useEffect(() => {
    if (selectRef.current && selectedId !== null) {
      selectRef.current.value = String(selectedId);
    }
  }, [selectedId]);

  function handleSelect(student: Student) {
    setSelectedId(student.id);
    setQuery(`${student.name}（${student.classRoom?.name || "未分班"}）`);
    setIsOpen(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setSelectedId(null);
    setIsOpen(true);
  }

  function handleFocus() {
    setIsOpen(true);
  }

  function handleBlur() {
    setTimeout(() => setIsOpen(false), 200);
  }

  return (
    <div className="relative">
      {/* 隐藏的 select 用于表单提交校验 */}
      <select
        ref={selectRef}
        name={name}
        required={required}
        className="absolute opacity-0 pointer-events-none"
        tabIndex={-1}
        value={selectedId !== null ? String(selectedId) : ""}
      >
        <option value="">请选择学生</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      {/* 可见的搜索输入框 */}
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={inputClass}
        autoComplete="off"
      />

      {/* 下拉结果列表 */}
      {isOpen && (
        <ul
          className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded border border-slate-200 bg-white shadow-lg"
        >
          {filtered.length > 0 ? (
            filtered.map((s) => (
              <li
                key={s.id}
                onMouseDown={() => handleSelect(s)}
                className="px-3 py-2 cursor-pointer hover:bg-brand-50 text-sm"
              >
                <span className="font-medium">{s.name}</span>
                {s.classRoom && (
                  <span className="text-slate-500 ml-1">({s.classRoom.name})</span>
                )}
                {s.phone && (
                  <span className="text-slate-400 ml-2 text-xs">{s.phone}</span>
                )}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-sm text-slate-500">无匹配学生</li>
          )}
        </ul>
      )}
    </div>
  );
}