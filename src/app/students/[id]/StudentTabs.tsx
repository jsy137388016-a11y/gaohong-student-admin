"use client";

import { useState } from "react";

type TabKey = "info" | "scores" | "disciplines" | "guarantees";

const TABS: { key: TabKey; label: string }[] = [
  { key: "info", label: "基本信息" },
  { key: "scores", label: "成绩记录" },
  { key: "disciplines", label: "违纪记录" },
  { key: "guarantees", label: "保证书" },
];

export function StudentTabs({ children }: { children: Record<TabKey, React.ReactNode> }) {
  const [active, setActive] = useState<TabKey>("info");

  return (
    <div>
      {/* Tab 栏 */}
      <div className="mb-6 flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActive(tab.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              active === tab.key
                ? "bg-brand-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      <div>{children[active]}</div>
    </div>
  );
}
