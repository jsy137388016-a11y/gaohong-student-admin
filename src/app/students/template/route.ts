export async function GET() {
  const csv = [
    ["姓名", "性别", "年级", "班级", "手机号", "家长姓名", "家长电话", "住宿状态", "艺考专业", "备注"],
    ["王小明", "男", "高三", "艺考冲刺1班", "13800001111", "王先生", "13900001111", "住宿", "播音主持", "数学需重点跟进"],
    ["刘雨", "女", "高三", "艺考冲刺2班", "13800002222", "刘女士", "13900002222", "走读", "美术", ""]
  ]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=students-template.csv"
    }
  });
}
