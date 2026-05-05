type QueryArgs = {
  where?: Record<string, any>;
  include?: Record<string, any>;
  orderBy?: Record<string, any> | Array<Record<string, any>>;
  take?: number;
  data?: Record<string, any>;
  create?: Record<string, any>;
  update?: Record<string, any>;
  select?: Record<string, boolean>;
};

type ModelName =
  | "user"
  | "classRoom"
  | "student"
  | "attendance"
  | "discipline"
  | "exam"
  | "score"
  | "communication"
  | "warningRecord"
  | "guaranteeLetter";

const tables: Record<ModelName, string> = {
  user: "User",
  classRoom: "ClassRoom",
  student: "Student",
  attendance: "Attendance",
  discipline: "Discipline",
  exam: "Exam",
  score: "Score",
  communication: "Communication",
  warningRecord: "WarningRecord",
  guaranteeLetter: "GuaranteeLetter"
};

const dateFields: Record<ModelName, string[]> = {
  user: ["createdAt", "updatedAt"],
  classRoom: ["createdAt", "updatedAt"],
  student: ["createdAt", "updatedAt", "focusMarkedAt"],
  attendance: ["date", "createdAt", "leaveStart", "leaveEnd"],
  discipline: ["recordedAt"],
  exam: ["examDate", "createdAt", "updatedAt"],
  score: ["createdAt", "updatedAt"],
  communication: ["contactedAt", "createdAt"],
  warningRecord: ["createdAt", "updatedAt", "nextFollowUpAt"],
  guaranteeLetter: ["createdAt", "updatedAt"]
};

const booleanFields: Record<ModelName, string[]> = {
  user: [],
  classRoom: [],
  student: ["isFocus"],
  attendance: ["parentConfirmed"],
  discipline: ["parentNotified"],
  exam: [],
  score: [],
  communication: [],
  warningRecord: [],
  guaranteeLetter: []
};

const updatedAtModels = new Set<ModelName>(["user", "classRoom", "student", "exam", "score", "warningRecord", "guaranteeLetter"]);

const relations: Record<ModelName, Record<string, any>> = {
  user: {},
  classRoom: {},
  student: {
    classRoom: { type: "one", model: "classRoom", localKey: "classId", foreignKey: "id" },
    attendances: { type: "many", model: "attendance", localKey: "id", foreignKey: "studentId" },
    disciplines: { type: "many", model: "discipline", localKey: "id", foreignKey: "studentId" },
    communications: { type: "many", model: "communication", localKey: "id", foreignKey: "studentId" },
    warningRecords: { type: "many", model: "warningRecord", localKey: "id", foreignKey: "studentId" },
    guaranteeLetters: { type: "many", model: "guaranteeLetter", localKey: "id", foreignKey: "studentId" }
  },
  attendance: {
    student: { type: "one", model: "student", localKey: "studentId", foreignKey: "id" }
  },
  discipline: {
    student: { type: "one", model: "student", localKey: "studentId", foreignKey: "id" }
  },
  exam: {
    scores: { type: "many", model: "score", localKey: "id", foreignKey: "examId" }
  },
  score: {
    student: { type: "one", model: "student", localKey: "studentId", foreignKey: "id" },
    exam: { type: "one", model: "exam", localKey: "examId", foreignKey: "id" }
  },
  communication: {
    student: { type: "one", model: "student", localKey: "studentId", foreignKey: "id" }
  },
  warningRecord: {
    student: { type: "one", model: "student", localKey: "studentId", foreignKey: "id" }
  },
  guaranteeLetter: {
    student: { type: "one", model: "student", localKey: "studentId", foreignKey: "id" }
  }
};

function sqlValue(value: any) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
}

function hydrate(model: ModelName, row: any) {
  if (!row) return row;
  const result = { ...row };
  for (const field of dateFields[model]) {
    if (result[field]) result[field] = new Date(result[field]);
  }
  for (const field of booleanFields[model]) {
    if (field in result) result[field] = Boolean(result[field]);
  }
  return result;
}

function applySelect(row: any, select?: Record<string, boolean>) {
  if (!row || !select) return row;
  return Object.fromEntries(Object.entries(select).filter(([, enabled]) => enabled).map(([key]) => [key, row[key]]));
}

class WhereBuilder {
  values: any[] = [];

  constructor(private model: ModelName, private alias = "t") {}

  build(where?: Record<string, any>) {
    const clause = this.condition(where || {});
    return clause ? ` WHERE ${clause}` : "";
  }

  private condition(where: Record<string, any>): string {
    const parts: string[] = [];

    for (const [key, value] of Object.entries(where)) {
      if (value === undefined) continue;
      if (key === "AND" && Array.isArray(value)) {
        const nested = value.map((item) => this.condition(item)).filter(Boolean);
        if (nested.length) parts.push(`(${nested.join(" AND ")})`);
        continue;
      }
      if (key === "OR" && Array.isArray(value)) {
        const nested = value.map((item) => this.condition(item)).filter(Boolean);
        if (nested.length) parts.push(`(${nested.join(" OR ")})`);
        continue;
      }

      const relation = relations[this.model][key];
      if (relation && value && typeof value === "object") {
        const child = new WhereBuilder(relation.model, "r");
        const childWhere = child.condition(value);
        this.values.push(...child.values);
        const childTable = tables[relation.model as ModelName];
        if (relation.type === "one") {
          parts.push(`EXISTS (SELECT 1 FROM "${childTable}" r WHERE r."${relation.foreignKey}" = ${this.alias}."${relation.localKey}"${childWhere ? ` AND ${childWhere}` : ""})`);
        }
        continue;
      }

      const column = `${this.alias}."${key}"`;
      if (value === null) {
        parts.push(`${column} IS NULL`);
      } else if (value && typeof value === "object" && !(value instanceof Date)) {
        for (const [operator, raw] of Object.entries(value)) {
          if (operator === "contains") {
            this.values.push(`%${raw}%`);
            parts.push(`${column} LIKE ?`);
          } else if (operator === "gte") {
            this.values.push(sqlValue(raw));
            parts.push(`${column} >= ?`);
          } else if (operator === "lt") {
            this.values.push(sqlValue(raw));
            parts.push(`${column} < ?`);
          } else if (operator === "not" && raw === null) {
            parts.push(`${column} IS NOT NULL`);
          }
        }
      } else {
        this.values.push(sqlValue(value));
        parts.push(`${column} = ?`);
      }
    }

    return parts.join(" AND ");
  }
}

function orderSql(orderBy?: QueryArgs["orderBy"]) {
  if (!orderBy) return "";
  const orders = Array.isArray(orderBy) ? orderBy : [orderBy];
  const parts = orders.flatMap((order) =>
    Object.entries(order).map(([field, direction]) => `t."${field}" ${String(direction).toUpperCase()}`)
  );
  return parts.length ? ` ORDER BY ${parts.join(", ")}` : "";
}

export function createD1Prisma(db: D1Database) {
  const delegates = Object.fromEntries(
    (Object.keys(tables) as ModelName[]).map((model) => [model, new D1Delegate(db, model)])
  );
  return delegates as any;
}

class D1Delegate {
  constructor(private db: D1Database, private model: ModelName) {}

  private get table() {
    return tables[this.model];
  }

  async findMany(args: QueryArgs = {}) {
    const where = new WhereBuilder(this.model);
    const limit = args.take ? ` LIMIT ${Number(args.take)}` : "";
    const sql = `SELECT t.* FROM "${this.table}" t${where.build(args.where)}${orderSql(args.orderBy)}${limit}`;
    const rows = ((await this.db.prepare(sql).bind(...where.values).all()).results || []) as any[];
    return Promise.all(rows.map((row) => this.withInclude(hydrate(this.model, row), args.include, args.select)));
  }

  async findFirst(args: QueryArgs = {}) {
    const rows = await this.findMany({ ...args, take: 1 });
    return rows[0] || null;
  }

  async findUnique(args: QueryArgs) {
    return this.findFirst(args);
  }

  async count(args: QueryArgs = {}) {
    const where = new WhereBuilder(this.model);
    const row = await this.db.prepare(`SELECT COUNT(*) as count FROM "${this.table}" t${where.build(args.where)}`).bind(...where.values).first<any>();
    return Number(row?.count || 0);
  }

  async create(args: QueryArgs) {
    const data = this.prepareData(args.data || {}, true);
    const keys = Object.keys(data);
    const placeholders = keys.map(() => "?").join(", ");
    const sql = `INSERT INTO "${this.table}" (${keys.map((key) => `"${key}"`).join(", ")}) VALUES (${placeholders})`;
    const result = await this.db.prepare(sql).bind(...keys.map((key) => sqlValue(data[key]))).run();
    return this.findUnique({ where: { id: result.meta.last_row_id } });
  }

  async update(args: QueryArgs) {
    const data = this.prepareData(args.data || {}, false);
    const keys = Object.keys(data);
    const where = new WhereBuilder(this.model);
    const sql = `UPDATE "${this.table}" SET ${keys.map((key) => `"${key}" = ?`).join(", ")}${where.build(args.where)}`;
    // WhereBuilder uses alias "t" but UPDATE has no alias — strip "t." prefix from WHERE
    const fixedSql = sql.replace(/t\."(\w+)"/g, '"$1"');
    const fixedValues = where.values;
    await this.db.prepare(fixedSql).bind(...keys.map((key) => sqlValue(data[key])), ...fixedValues).run();
    return this.findUnique({ where: args.where });
  }

  async updateMany(args: QueryArgs) {
    const data = this.prepareData(args.data || {}, false);
    const keys = Object.keys(data);
    if (keys.length === 0) return { count: 0 };
    const where = new WhereBuilder(this.model);
    const sql = `UPDATE "${this.table}" SET ${keys.map((key) => `"${key}" = ?`).join(", ")}${where.build(args.where)}`;
    const fixedSql = sql.replace(/t\."(\w+)"/g, '"$1"');
    const result = await this.db.prepare(fixedSql).bind(...keys.map((key) => sqlValue(data[key])), ...where.values).run();
    return { count: result.meta.changes };
  }

  async deleteMany(args: QueryArgs = {}) {
    const where = new WhereBuilder(this.model);
    const sql = `DELETE FROM "${this.table}"${where.build(args.where)}`;
    const fixedSql = sql.replace(/t\."(\w+)"/g, '"$1"');
    const result = await this.db.prepare(fixedSql).bind(...where.values).run();
    return { count: result.meta.changes };
  }

  async delete(args: QueryArgs) {
    const existing = await this.findUnique({ where: args.where });
    const where = new WhereBuilder(this.model);
    const sql = `DELETE FROM "${this.table}"${where.build(args.where)}`;
    const fixedSql = sql.replace(/t\."(\w+)"/g, '"$1"');
    await this.db.prepare(fixedSql).bind(...where.values).run();
    return existing;
  }

  async upsert(args: QueryArgs) {
    const existing = await this.findUnique({ where: this.expandCompoundWhere(args.where || {}) });
    if (existing) return this.update({ where: { id: existing.id }, data: args.update });
    return this.create({ data: args.create });
  }

  private expandCompoundWhere(where: Record<string, any>) {
    if (where.examId_studentId) return where.examId_studentId;
    return where;
  }

  private prepareData(data: Record<string, any>, isCreate: boolean) {
    const result = { ...data };
    const now = new Date();
    if (updatedAtModels.has(this.model)) result.updatedAt = now;
    if (isCreate && this.model === "exam" && !result.createdAt) result.createdAt = now;
    if (isCreate && this.model === "attendance" && !result.createdAt) result.createdAt = now;
    if (isCreate && this.model === "communication" && !result.createdAt) result.createdAt = now;
    if (isCreate && this.model === "discipline" && !result.recordedAt) result.recordedAt = now;
    return result;
  }

  private async withInclude(row: any, include?: Record<string, any>, select?: Record<string, boolean>) {
    if (!row) return row;
    const result = applySelect(row, select);
    if (!include) return result;

    for (const [name, options] of Object.entries(include)) {
      if (name === "_count" && this.model === "classRoom") {
        const select = options?.select || {};
        result._count = {};
        if (select.students) {
          result._count.students = await new D1Delegate(this.db, "student").count({ where: { classId: row.id } });
        }
        continue;
      }

      const relation = relations[this.model][name];
      if (!relation) continue;
      const delegate = new D1Delegate(this.db, relation.model);
      const nested = options === true ? {} : options || {};
      if (relation.type === "one") {
        result[name] = row[relation.localKey] == null
          ? null
          : await delegate.findUnique({
              where: { [relation.foreignKey]: row[relation.localKey] },
              include: nested.include
            });
      } else {
        result[name] = await delegate.findMany({
          where: { [relation.foreignKey]: row[relation.localKey] },
          include: nested.include,
          orderBy: nested.orderBy,
          take: nested.take
        });
      }
    }

    return result;
  }
}
