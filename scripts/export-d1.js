const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const tables = ["User","ClassRoom","Student","Attendance","Discipline","Exam","Score","Communication","GuaranteeLetter","WarningRecord"];
const data = {};

for (const table of tables) {
  console.log(`Exporting ${table}...`);
  const result = execSync(`npx wrangler d1 execute gaohong-student-system-db --remote --command "SELECT * FROM \\"${table}\\"" --json`, {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"]
  });
  const parsed = JSON.parse(result);
  data[table] = parsed[0]?.results || [];
  console.log(`  → ${data[table].length} rows`);
}

fs.writeFileSync(path.join(__dirname, "seed-data.json"), JSON.stringify(data, null, 2));
console.log(`\nDone! Exported to scripts/seed-data.json`);
