/**
 * seed.ts — canonical seed for a fresh database
 *
 * Creates two independent workspaces with members, projects, tasks,
 * work logs (14 days), and steps. Safe to re-run (skips existing rows).
 *
 *   npx tsx scripts/seed.ts
 *   DATABASE_URL="..." npx tsx scripts/seed.ts   # production
 */
import { config } from "dotenv";
config({ path: ".env.local", override: false });

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as schema from "../src/lib/db/schema";

const {
  users, workspaces, workspaceMembers,
  projects, taskLayers, workflowStatuses,
  tasks, steps, workLogs,
} = schema;

// ── helpers ────────────────────────────────────────────────────────────────
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return min + Math.floor(Math.random() * (max - min + 1)); }
function isWeekend(d: Date) { return d.getDay() === 0 || d.getDay() === 6; }

// ── shared config ──────────────────────────────────────────────────────────
const BIRDS = [
  { name: "Condor",  color: "#8b5cf6", position: 0 },
  { name: "Eagle",   color: "#3b82f6", position: 1 },
  { name: "Pigeon",  color: "#22c55e", position: 2 },
  { name: "Sparrow", color: "#9ca3af", position: 3 },
];

// ══════════════════════════════════════════════════════════════════════════
// ORG 1 — Acme Corp (English)
// ══════════════════════════════════════════════════════════════════════════
const ORG1 = {
  workspace: { name: "Acme Corp", description: "Acme Corp project workspace" },
  owner:     { name: "Alex Rivera",    email: "alex.rivera@example.com" },
  members: [
    { name: "Alice Chen",      email: "alice.chen@example.com" },
    { name: "Bob Martinez",    email: "bob.martinez@example.com" },
    { name: "Carol Kim",       email: "carol.kim@example.com" },
    { name: "David Patel",     email: "david.patel@example.com" },
    { name: "Emma Johnson",    email: "emma.johnson@example.com" },
    { name: "Frank Nguyen",    email: "frank.nguyen@example.com" },
    { name: "Grace Liu",       email: "grace.liu@example.com" },
    { name: "Henry Brown",     email: "henry.brown@example.com" },
    { name: "Isabella Davis",  email: "isabella.davis@example.com" },
    { name: "James Wilson",    email: "james.wilson@example.com" },
    { name: "Kate Thompson",   email: "kate.thompson@example.com" },
    { name: "Liam Anderson",   email: "liam.anderson@example.com" },
    { name: "Maya Rodriguez",  email: "maya.rodriguez@example.com" },
    { name: "Noah Taylor",     email: "noah.taylor@example.com" },
  ],
  statuses: [
    { name: "To Do",       color: "#9ca3af", isDefault: true,  isCompleted: false },
    { name: "In Progress", color: "#3b82f6", isDefault: false, isCompleted: false },
    { name: "In Review",   color: "#f59e0b", isDefault: false, isCompleted: false },
    { name: "Done",        color: "#22c55e", isDefault: false, isCompleted: true  },
  ],
  workLogNotes: [
    "Implemented initial draft, needs review",
    "Fixed edge case in validation logic",
    "Code review with the team",
    "Daily standup + sprint planning",
    "Pair programming session",
    "Debugging integration test failures",
    "Writing unit tests",
    "Reviewing pull requests",
    "Refactoring for better readability",
    "Setting up CI pipeline",
    "Documentation updates",
    "Performance profiling session",
    "Stakeholder demo prep",
    "Syncing with design on UI changes",
    "Investigating production issue",
    "Resolved merge conflict in main",
    "Finished feature branch, opened PR",
    "Backlog grooming session",
    null, null, null, null,
  ],
  stepsByTask: {
    "Elasticsearch integration": [
      { title: "Set up Elasticsearch cluster",      status: "Done",        done: true  },
      { title: "Define document index schema",       status: "Done",        done: true  },
      { title: "Implement search service layer",     status: "In Progress", done: false },
      { title: "Write integration tests",            status: "To Do",       done: false },
    ],
    "Cart Management": [
      { title: "Design cart data model",             status: "Done",        done: true  },
      { title: "Build cart API endpoints",           status: "In Progress", done: false },
      { title: "Frontend cart state management",     status: "To Do",       done: false },
    ],
    "Payment integration": [
      { title: "Evaluate payment provider options",  status: "Done",        done: true  },
      { title: "Implement Stripe checkout session",  status: "In Progress", done: false },
      { title: "Handle webhook events",              status: "To Do",       done: false },
      { title: "Test with sandbox credentials",      status: "To Do",       done: false },
    ],
    "Checkout Flow": [
      { title: "Wireframe & UX review",              status: "Done",        done: true  },
      { title: "Multi-step form component",          status: "In Progress", done: false },
      { title: "Order summary side panel",           status: "To Do",       done: false },
    ],
    "Product Management": [
      { title: "Define admin roles & permissions",   status: "Done",        done: true  },
      { title: "Build product table with filters",   status: "In Progress", done: false },
      { title: "Implement inline edit / delete",     status: "To Do",       done: false },
    ],
    "ETL Framework": [
      { title: "Document pipeline architecture",     status: "Done",        done: true  },
      { title: "Implement source adapter interface", status: "Done",        done: true  },
      { title: "Add data quality validation",        status: "In Progress", done: false },
      { title: "Performance benchmarking",           status: "To Do",       done: false },
    ],
    "Chart Library": [
      { title: "Evaluate D3 vs Recharts",            status: "Done",        done: true  },
      { title: "Set up chart abstraction layer",     status: "Done",        done: true  },
      { title: "Responsive sizing & theming",        status: "In Progress", done: false },
      { title: "Storybook documentation",            status: "To Do",       done: false },
    ],
    "Dashboard Builder": [
      { title: "Research grid layout libraries",     status: "Done",        done: true  },
      { title: "Prototype drag-and-drop canvas",     status: "In Progress", done: false },
      { title: "Persist layout to database",         status: "To Do",       done: false },
      { title: "Mobile-responsive fallback",         status: "To Do",       done: false },
    ],
  } as Record<string, Array<{ title: string; status: string; done: boolean }>>,
};

// ══════════════════════════════════════════════════════════════════════════
// ORG 2 — 株式会社テクノビジョン (Japanese)
// ══════════════════════════════════════════════════════════════════════════
const ORG2 = {
  workspace: { name: "株式会社テクノビジョン", description: "テクノビジョン社内プロジェクト管理" },
  owner:     { name: "田中 太郎",   email: "taro.tanaka@technovision.jp" },
  members: [
    { name: "佐藤 花子",   email: "hanako.sato@technovision.jp"    },
    { name: "鈴木 一郎",   email: "ichiro.suzuki@technovision.jp"  },
    { name: "山田 美咲",   email: "misaki.yamada@technovision.jp"  },
    { name: "伊藤 健太",   email: "kenta.ito@technovision.jp"      },
    { name: "渡辺 さくら", email: "sakura.watanabe@technovision.jp"},
    { name: "中村 大輔",   email: "daisuke.nakamura@technovision.jp"},
    { name: "小林 愛",     email: "ai.kobayashi@technovision.jp"   },
    { name: "加藤 翔",     email: "sho.kato@technovision.jp"       },
    { name: "吉田 雅子",   email: "masako.yoshida@technovision.jp" },
    { name: "山本 直樹",   email: "naoki.yamamoto@technovision.jp" },
    { name: "松本 由美",   email: "yumi.matsumoto@technovision.jp" },
    { name: "井上 拓也",   email: "takuya.inoue@technovision.jp"   },
    { name: "木村 明日香", email: "asuka.kimura@technovision.jp"   },
    { name: "林 浩二",     email: "koji.hayashi@technovision.jp"   },
  ],
  statuses: [
    { name: "未着手",     color: "#9ca3af", isDefault: true,  isCompleted: false },
    { name: "進行中",     color: "#3b82f6", isDefault: false, isCompleted: false },
    { name: "レビュー中", color: "#f59e0b", isDefault: false, isCompleted: false },
    { name: "完了",       color: "#22c55e", isDefault: false, isCompleted: true  },
  ],
  workLogNotes: [
    "初期実装完了、レビュー待ち",
    "バグ修正：バリデーションのエッジケース対応",
    "チームコードレビュー",
    "デイリースタンドアップ＋スプリント計画",
    "ペアプログラミング作業",
    "結合テストの失敗を調査",
    "単体テスト作成",
    "プルリクエストレビュー",
    "可読性向上のためリファクタリング",
    "CI/CDパイプライン設定",
    "ドキュメント更新",
    "パフォーマンス計測セッション",
    "ステークホルダーデモ準備",
    "UIデザインとの確認ミーティング",
    "本番障害の調査対応",
    "マージコンフリクト解消",
    "機能ブランチ完成、PR作成",
    "バックログ整理",
    null, null, null, null,
  ],
  stepsByTask: {
    "コンポーネントライブラリ設計": [
      { title: "既存コンポーネントの棚卸し",        status: "完了",       done: true  },
      { title: "デザイントークン定義",              status: "完了",       done: true  },
      { title: "Storybookセットアップ",             status: "進行中",     done: false },
      { title: "利用ガイドライン作成",              status: "未着手",     done: false },
    ],
    "決済連携": [
      { title: "決済プロバイダーの選定",            status: "完了",       done: true  },
      { title: "Stripeチェックアウト実装",          status: "進行中",     done: false },
      { title: "Webhookイベントハンドリング",        status: "未着手",     done: false },
      { title: "サンドボックスでの動作確認",         status: "未着手",     done: false },
    ],
    "CI/CD構築": [
      { title: "ブランチ戦略の確認",                status: "完了",       done: true  },
      { title: "GitHub Actionsワークフロー作成",    status: "進行中",     done: false },
      { title: "本番デプロイ自動化",                status: "未着手",     done: false },
    ],
    "商品検索API": [
      { title: "検索要件定義",                      status: "完了",       done: true  },
      { title: "Elasticsearchスキーマ設計",         status: "完了",       done: true  },
      { title: "検索APIエンドポイント実装",          status: "進行中",     done: false },
      { title: "パフォーマンステスト",              status: "未着手",     done: false },
    ],
    "承認フローエンジン": [
      { title: "承認ルール仕様書作成",              status: "完了",       done: true  },
      { title: "フロー定義のデータモデル設計",       status: "完了",       done: true  },
      { title: "条件分岐ロジック実装",              status: "進行中",     done: false },
      { title: "エラーハンドリングと通知",           status: "未着手",     done: false },
    ],
    "BIダッシュボード": [
      { title: "KPI指標の整理",                     status: "完了",       done: true  },
      { title: "ダッシュボードUIプロトタイプ",        status: "完了",       done: true  },
      { title: "リアルタイムデータ更新",             status: "レビュー中", done: false },
      { title: "エクスポート機能（Excel/PDF）",      status: "未着手",     done: false },
    ],
    "データパイプライン構築": [
      { title: "データソース調査・整理",             status: "完了",       done: true  },
      { title: "ETLジョブ実装",                     status: "進行中",     done: false },
      { title: "データ品質チェック自動化",           status: "未着手",     done: false },
    ],
    "シングルサインオン実装": [
      { title: "Azure AD連携の設計",                status: "完了",       done: true  },
      { title: "OAuth2フロー実装",                  status: "進行中",     done: false },
      { title: "セッション管理とログアウト処理",     status: "未着手",     done: false },
    ],
  } as Record<string, Array<{ title: string; status: string; done: boolean }>>,
};

// ══════════════════════════════════════════════════════════════════════════
// seed functions
// ══════════════════════════════════════════════════════════════════════════
async function seedOrg(
  db: ReturnType<typeof drizzle>,
  org: typeof ORG1 | typeof ORG2,
  passwordHash: string,
  taskPosStart: number,
) {
  const log = (msg: string) => console.log(`  ${msg}`);

  // ── users ────────────────────────────────────────────────────────────────
  const getOrCreateUser = async (name: string, email: string) => {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email), columns: { id: true },
    });
    if (existing) { log(`skip user: ${name}`); return existing.id; }
    const id = crypto.randomUUID();
    await db.insert(users).values({ id, email, name, passwordHash });
    log(`created user: ${name}`);
    return id;
  };

  const ownerId = await getOrCreateUser(org.owner.name, org.owner.email);
  const memberIds = await Promise.all(
    org.members.map((m) => getOrCreateUser(m.name, m.email))
  );
  const allMemberIds = [ownerId, ...memberIds];

  // ── workspace ────────────────────────────────────────────────────────────
  let ws = await db.query.workspaces.findFirst({
    where: eq(workspaces.name, org.workspace.name), columns: { id: true },
  });
  if (ws) {
    log(`skip workspace: ${org.workspace.name}`);
  } else {
    const id = crypto.randomUUID();
    await db.insert(workspaces).values({
      id, ownerId, name: org.workspace.name, description: org.workspace.description,
    });
    ws = { id };
    log(`created workspace: ${org.workspace.name}`);
  }
  const workspaceId = ws.id;

  // ── workspace members ────────────────────────────────────────────────────
  for (let i = 0; i < allMemberIds.length; i++) {
    const userId = allMemberIds[i];
    const role = i === 0 ? "Admin" : i <= 2 ? "Project_Manager" : "Team_Member";
    const exists = await db.query.workspaceMembers.findFirst({
      where: and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)),
    });
    if (!exists) {
      await db.insert(workspaceMembers).values({
        id: crypto.randomUUID(), workspaceId, userId, role,
      });
    }
  }

  // ── project factory ──────────────────────────────────────────────────────
  let taskPos = taskPosStart;

  const setupProject = async (name: string, color: string) => {
    const projectId = crypto.randomUUID();
    await db.insert(projects).values({
      id: projectId, workspaceId, name, color, createdBy: ownerId,
    });

    const statusMap: Record<string, string> = {};
    for (let i = 0; i < org.statuses.length; i++) {
      const s = org.statuses[i];
      const id = crypto.randomUUID();
      await db.insert(workflowStatuses).values({
        id, projectId, name: s.name, color: s.color,
        position: i, isDefault: s.isDefault, isCompleted: s.isCompleted,
      });
      statusMap[s.name] = id;
    }

    const layerMap: Record<string, string> = {};
    for (const bird of BIRDS) {
      const id = crypto.randomUUID();
      await db.insert(taskLayers).values({
        id, projectId, name: bird.name, color: bird.color, position: bird.position,
      });
      layerMap[bird.name] = id;
    }

    return { projectId, statusMap, layerMap };
  };

  const projectTaskIds: Record<string, string[]> = {};

  const addTask = async (
    title: string, projectId: string, layerId: string,
    parentId: string | null, statusId: string,
    priority: "None" | "Low" | "Medium" | "High" | "Urgent",
    assigneeId?: string,
  ) => {
    const id = crypto.randomUUID();
    await db.insert(tasks).values({
      id, projectId, statusId, layerId,
      parentTaskId: parentId, title, priority,
      position: taskPos++, createdBy: ownerId,
      assigneeId: assigneeId ?? null,
    });
    if (!projectTaskIds[projectId]) projectTaskIds[projectId] = [];
    projectTaskIds[projectId].push(id);
    return id;
  };

  const rm = () => pick(memberIds); // random non-owner member

  return { setupProject, addTask, allMemberIds, memberIds, projectTaskIds, workspaceId, rm };
}

// ── work logs ──────────────────────────────────────────────────────────────
async function seedWorkLogs(
  db: ReturnType<typeof drizzle>,
  userIds: string[],
  taskIdPool: string[],
  notes: Array<string | null>,
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - 13 + i);
    return d;
  });

  let count = 0;
  for (const userId of userIds) {
    for (const day of days) {
      const weekend = isWeekend(day);
      const maxLogs = weekend ? randInt(0, 1) : randInt(2, 4);
      if (maxLogs === 0) continue;

      let hour   = randInt(weekend ? 10 : 9, weekend ? 11 : 10);
      let minute = pick([0, 15, 30]);

      for (let i = 0; i < maxLogs; i++) {
        const startTime = new Date(day);
        startTime.setHours(hour, minute, 0, 0);

        const durationMins = pick([60, 75, 90, 105, 120, 135, 150, 165, 180]);
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + durationMins);
        if (endTime.getHours() >= 19) break;

        await db.insert(workLogs).values({
          id: crypto.randomUUID(),
          userId, taskId: pick(taskIdPool),
          startTime, endTime, note: pick(notes),
        });
        count++;

        const nextStart = new Date(endTime);
        nextStart.setMinutes(nextStart.getMinutes() + pick([15, 15, 30]));
        hour   = nextStart.getHours();
        minute = nextStart.getMinutes();
      }
    }
  }
  return count;
}

// ── steps ──────────────────────────────────────────────────────────────────
async function seedSteps(
  db: ReturnType<typeof drizzle>,
  projectIds: string[],
  stepsByTask: Record<string, Array<{ title: string; status: string; done: boolean }>>,
  memberIds: string[],
) {
  let count = 0;
  for (const projectId of projectIds) {
    const statuses = await db.query.workflowStatuses.findMany({
      where: eq(workflowStatuses.projectId, projectId),
      columns: { id: true, name: true },
    });
    const statusMap = Object.fromEntries(statuses.map((s) => [s.name, s.id]));

    const projectTasks = await db.query.tasks.findMany({
      where: eq(tasks.projectId, projectId),
      columns: { id: true, title: true },
    });

    for (const task of projectTasks) {
      const defs = stepsByTask[task.title];
      if (!defs) continue;

      await db.delete(steps).where(eq(steps.taskId, task.id));

      for (let pos = 0; pos < defs.length; pos++) {
        const def = defs[pos];
        const statusId = statusMap[def.status];
        if (!statusId) continue;
        await db.insert(steps).values({
          id: crypto.randomUUID(), taskId: task.id, statusId,
          title: def.title, position: pos,
          isCompleted: def.done, assigneeId: pick(memberIds),
        });
        count++;
      }
    }
  }
  return count;
}

// ══════════════════════════════════════════════════════════════════════════
// main
// ══════════════════════════════════════════════════════════════════════════
async function main() {
  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 10,
  });
  const db = drizzle(pool, { schema, mode: "default" });
  const passwordHash = await bcrypt.hash("password123", 10);

  // ── Org 1: Acme Corp ────────────────────────────────────────────────────
  console.log("\n━━ Org 1: Acme Corp ━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  const o1 = await seedOrg(db, ORG1, passwordHash, 1000);
  const { setupProject: sp1, addTask: at1, rm: rm1, memberIds: m1, projectTaskIds: pt1 } = o1;

  console.log("\n  [Project] E-Commerce Platform");
  const { projectId: p1, statusMap: s1, layerMap: l1 } = await sp1("E-Commerce Platform", "#6366f1");

  const c1 = await at1("Product Catalog",           p1,l1.Condor,null, s1["To Do"],       "High");
  const e1 = await at1("Search & Filtering",         p1,l1.Eagle, c1,  s1["In Progress"],  "High",   rm1());
  const pi1= await at1("Elasticsearch integration",  p1,l1.Pigeon,e1,  s1["In Progress"],  "High",   rm1());
  await at1("Configure index mappings",              p1,l1.Sparrow,pi1,s1["Done"],         "Medium", rm1());
  await at1("Implement search UI components",        p1,l1.Sparrow,pi1,s1["In Progress"],  "Medium", rm1());
  await at1("Filter sidebar UI",                     p1,l1.Pigeon,e1,  s1["To Do"],        "Medium", rm1());
  await at1("Category navigation menu",              p1,l1.Pigeon,e1,  s1["To Do"],        "Low",    rm1());
  const e2 = await at1("Product Detail Page",        p1,l1.Eagle, c1,  s1["In Progress"],  "High",   rm1());
  await at1("Image gallery with zoom",               p1,l1.Pigeon,e2,  s1["In Review"],    "Medium", rm1());
  await at1("Customer reviews & ratings",            p1,l1.Pigeon,e2,  s1["To Do"],        "Low",    rm1());
  const c2 = await at1("Shopping Cart",              p1,l1.Condor,null, s1["In Progress"], "Urgent");
  const e3 = await at1("Cart Management",            p1,l1.Eagle, c2,  s1["In Progress"],  "High",   rm1());
  await at1("Add / remove items",                    p1,l1.Pigeon,e3,  s1["Done"],         "High",   rm1());
  await at1("Quantity update controls",              p1,l1.Pigeon,e3,  s1["Done"],         "Medium", rm1());
  await at1("Persistent cart (logged-in users)",     p1,l1.Pigeon,e3,  s1["In Progress"],  "Medium", rm1());
  const e4 = await at1("Checkout Flow",              p1,l1.Eagle, c2,  s1["To Do"],        "Urgent", rm1());
  const pi4= await at1("Shipping address form",      p1,l1.Pigeon,e4,  s1["To Do"],        "High",   rm1());
  await at1("Address validation API",                p1,l1.Sparrow,pi4,s1["To Do"],        "Medium", rm1());
  const pi5= await at1("Payment integration",        p1,l1.Pigeon,e4,  s1["To Do"],        "Urgent", rm1());
  await at1("Stripe webhook handler",                p1,l1.Sparrow,pi5,s1["To Do"],        "High",   rm1());
  await at1("Order confirmation email",              p1,l1.Pigeon,e4,  s1["To Do"],        "Medium", rm1());
  const c3 = await at1("Admin Dashboard",            p1,l1.Condor,null, s1["To Do"],       "Medium");
  const e5 = await at1("Product Management",         p1,l1.Eagle, c3,  s1["To Do"],        "High",   rm1());
  await at1("Product CRUD interface",                p1,l1.Pigeon,e5,  s1["To Do"],        "High",   rm1());
  await at1("Bulk CSV import / export",              p1,l1.Pigeon,e5,  s1["To Do"],        "Medium", rm1());

  console.log("\n  [Project] Data Analytics Dashboard");
  const { projectId: p2, statusMap: s2, layerMap: l2 } = await sp1("Data Analytics Dashboard", "#f59e0b");

  const d1 = await at1("Data Ingestion Pipeline",    p2,l2.Condor,null, s2["In Progress"], "High");
  const de1= await at1("ETL Framework",              p2,l2.Eagle, d1,  s2["In Progress"],  "High",   rm1());
  const dp1= await at1("Source connectors",          p2,l2.Pigeon,de1, s2["Done"],         "High",   rm1());
  await at1("REST API connector",                    p2,l2.Sparrow,dp1,s2["Done"],         "Medium", rm1());
  await at1("Database connector",                    p2,l2.Sparrow,dp1,s2["In Review"],    "Medium", rm1());
  await at1("Data transformation rules",             p2,l2.Pigeon,de1, s2["In Progress"],  "High",   rm1());
  await at1("Error handling & retry logic",          p2,l2.Pigeon,de1, s2["To Do"],        "Medium", rm1());
  const de2= await at1("Real-time Streaming",        p2,l2.Eagle, d1,  s2["To Do"],        "High",   rm1());
  await at1("Kafka topic setup",                     p2,l2.Pigeon,de2, s2["To Do"],        "High",   rm1());
  await at1("Stream processing jobs",                p2,l2.Pigeon,de2, s2["To Do"],        "High",   rm1());
  const d2 = await at1("Visualization Layer",        p2,l2.Condor,null, s2["In Progress"], "High");
  const de3= await at1("Chart Library",              p2,l2.Eagle, d2,  s2["In Progress"],  "High",   rm1());
  await at1("Time-series line charts",               p2,l2.Pigeon,de3, s2["In Progress"],  "High",   rm1());
  await at1("Bar and pie charts",                    p2,l2.Pigeon,de3, s2["Done"],         "Medium", rm1());
  const dp3= await at1("Drill-down functionality",   p2,l2.Pigeon,de3, s2["In Review"],    "Medium", rm1());
  await at1("Cross-filter on chart click",           p2,l2.Sparrow,dp3,s2["In Review"],    "Medium", rm1());
  const de4= await at1("Dashboard Builder",          p2,l2.Eagle, d2,  s2["To Do"],        "Medium", rm1());
  await at1("Drag-and-drop widget layout",           p2,l2.Pigeon,de4, s2["To Do"],        "High",   rm1());
  await at1("Widget configuration panel",            p2,l2.Pigeon,de4, s2["To Do"],        "Medium", rm1());
  const dp4= await at1("Export to PDF / PNG",        p2,l2.Pigeon,de4, s2["To Do"],        "Low",    rm1());
  await at1("Scheduled email reports",               p2,l2.Sparrow,dp4,s2["To Do"],        "Low",    rm1());
  const d3 = await at1("Access Control",             p2,l2.Condor,null, s2["To Do"],       "High");
  const de5= await at1("Role-Based Access",          p2,l2.Eagle, d3,  s2["To Do"],        "High",   rm1());
  await at1("Dashboard sharing & permissions",       p2,l2.Pigeon,de5, s2["To Do"],        "High",   rm1());
  await at1("Row-level data security",               p2,l2.Pigeon,de5, s2["To Do"],        "High",   rm1());

  const o1AllTaskIds = [...(pt1[p1] ?? []), ...(pt1[p2] ?? [])];
  const o1Logs = await seedWorkLogs(db, o1.allMemberIds, o1AllTaskIds, ORG1.workLogNotes);
  const o1Steps = await seedSteps(db, [p1, p2], ORG1.stepsByTask, o1.allMemberIds);
  console.log(`\n  tasks: ${o1AllTaskIds.length} | work logs: ${o1Logs} | steps: ${o1Steps}`);

  // ── Org 2: 株式会社テクノビジョン ────────────────────────────────────────
  console.log("\n━━ Org 2: 株式会社テクノビジョン ━━━━━━━━━━━━━━━━━━");
  const o2 = await seedOrg(db, ORG2, passwordHash, 2000);
  const { setupProject: sp2, addTask: at2, rm: rm2, memberIds: m2, projectTaskIds: pt2 } = o2;

  console.log("\n  [Project] ECサイトリニューアル");
  const { projectId: jp1, statusMap: js1, layerMap: jl1 } = await sp2("ECサイトリニューアル", "#e11d48");

  const jc1 = await at2("フロントエンド刷新",         jp1,jl1.Condor,null, js1["進行中"], "High");
  const je1 = await at2("デザインシステム構築",        jp1,jl1.Eagle, jc1, js1["進行中"], "High",   rm2());
  const jpi1= await at2("コンポーネントライブラリ設計",jp1,jl1.Pigeon,je1, js1["進行中"], "High",   rm2());
  await at2("ボタン・フォームコンポーネント",          jp1,jl1.Sparrow,jpi1,js1["完了"],  "Medium", rm2());
  await at2("アイコンセット整備",                     jp1,jl1.Sparrow,jpi1,js1["進行中"],"Low",    rm2());
  await at2("レスポンシブデザイン対応",                jp1,jl1.Pigeon,je1, js1["未着手"], "Medium", rm2());
  await at2("アクセシビリティ対応",                   jp1,jl1.Pigeon,je1, js1["未着手"], "Medium", rm2());
  const je2 = await at2("ページ実装",                 jp1,jl1.Eagle, jc1, js1["進行中"], "High",   rm2());
  await at2("トップページリデザイン",                 jp1,jl1.Pigeon,je2, js1["レビュー中"],"Medium",rm2());
  await at2("商品一覧ページ",                         jp1,jl1.Pigeon,je2, js1["未着手"], "Medium", rm2());
  const jc2 = await at2("バックエンド改修",            jp1,jl1.Condor,null, js1["進行中"],"High");
  const je3 = await at2("API設計・実装",               jp1,jl1.Eagle, jc2, js1["進行中"], "High",   rm2());
  const jpi3= await at2("商品検索API",                 jp1,jl1.Pigeon,je3, js1["進行中"], "High",   rm2());
  await at2("全文検索エンジン統合",                    jp1,jl1.Sparrow,jpi3,js1["完了"],  "High",   rm2());
  await at2("フィルタリング機能",                      jp1,jl1.Sparrow,jpi3,js1["進行中"],"Medium", rm2());
  await at2("カート・注文API",                         jp1,jl1.Pigeon,je3, js1["未着手"], "High",   rm2());
  await at2("決済連携",                               jp1,jl1.Pigeon,je3, js1["未着手"], "Urgent", rm2());
  const je4 = await at2("データベース最適化",          jp1,jl1.Eagle, jc2, js1["未着手"], "Medium", rm2());
  await at2("クエリパフォーマンス改善",                jp1,jl1.Pigeon,je4, js1["未着手"], "Medium", rm2());
  await at2("インデックス見直し",                      jp1,jl1.Pigeon,je4, js1["未着手"], "Low",    rm2());
  const jc3 = await at2("インフラ整備",                jp1,jl1.Condor,null, js1["進行中"],"Medium");
  const je5 = await at2("CI/CD構築",                  jp1,jl1.Eagle, jc3, js1["進行中"], "High",   rm2());
  await at2("GitHub Actions設定",                     jp1,jl1.Pigeon,je5, js1["完了"],   "Medium", rm2());
  const je6 = await at2("監視・ログ基盤",              jp1,jl1.Eagle, jc3, js1["未着手"], "Medium", rm2());
  await at2("エラー監視・アラート設定",                jp1,jl1.Pigeon,je6, js1["未着手"], "Medium", rm2());

  console.log("\n  [Project] 社内DXプラットフォーム");
  const { projectId: jp2, statusMap: js2, layerMap: jl2 } = await sp2("社内DXプラットフォーム", "#0891b2");

  const jd1 = await at2("ワークフロー自動化",          jp2,jl2.Condor,null, js2["進行中"], "High");
  const jde1= await at2("承認フローエンジン",           jp2,jl2.Eagle, jd1, js2["進行中"], "High",   rm2());
  const jdp1= await at2("申請フォームビルダー",         jp2,jl2.Pigeon,jde1,js2["進行中"], "High",   rm2());
  await at2("条件分岐ロジック",                        jp2,jl2.Sparrow,jdp1,js2["レビュー中"],"Medium",rm2());
  await at2("通知・リマインド機能",                    jp2,jl2.Sparrow,jdp1,js2["未着手"], "Medium", rm2());
  await at2("承認履歴・監査ログ",                      jp2,jl2.Pigeon,jde1,js2["未着手"], "Medium", rm2());
  await at2("モバイル対応",                            jp2,jl2.Pigeon,jde1,js2["未着手"], "Low",    rm2());
  const jde2= await at2("外部システム連携",             jp2,jl2.Eagle, jd1, js2["未着手"], "High",   rm2());
  await at2("勤怠システムAPI連携",                     jp2,jl2.Pigeon,jde2,js2["未着手"], "High",   rm2());
  await at2("経費精算システム連携",                    jp2,jl2.Pigeon,jde2,js2["未着手"], "Medium", rm2());
  const jd2 = await at2("データ分析基盤",              jp2,jl2.Condor,null, js2["進行中"], "High");
  const jde3= await at2("BIダッシュボード",             jp2,jl2.Eagle, jd2, js2["進行中"], "High",   rm2());
  await at2("売上レポート自動生成",                    jp2,jl2.Pigeon,jde3,js2["レビュー中"],"High", rm2());
  await at2("KPIモニタリング",                         jp2,jl2.Pigeon,jde3,js2["進行中"], "Medium", rm2());
  const jde4= await at2("データパイプライン構築",       jp2,jl2.Eagle, jd2, js2["進行中"], "High",   rm2());
  const jdp4= await at2("ETLジョブ設計",               jp2,jl2.Pigeon,jde4,js2["完了"],   "High",   rm2());
  await at2("データウェアハウス設計",                  jp2,jl2.Pigeon,jde4,js2["進行中"], "High",   rm2());
  await at2("データ品質チェック自動化",                jp2,jl2.Sparrow,jdp4,js2["未着手"],"Medium", rm2());
  const jd3 = await at2("セキュリティ・認証",          jp2,jl2.Condor,null, js2["進行中"], "Urgent");
  const jde5= await at2("シングルサインオン実装",       jp2,jl2.Eagle, jd3, js2["進行中"], "Urgent", rm2());
  await at2("Azure AD連携",                            jp2,jl2.Pigeon,jde5,js2["レビュー中"],"High",rm2());
  await at2("ロールベースアクセス制御",                jp2,jl2.Pigeon,jde5,js2["進行中"], "High",   rm2());
  const jde6= await at2("脆弱性診断対応",              jp2,jl2.Eagle, jd3, js2["未着手"], "High",   rm2());
  await at2("ペネトレーションテスト",                  jp2,jl2.Pigeon,jde6,js2["未着手"], "High",   rm2());
  await at2("セキュリティポリシー整備",                jp2,jl2.Pigeon,jde6,js2["未着手"], "Medium", rm2());

  const o2AllTaskIds = [...(pt2[jp1] ?? []), ...(pt2[jp2] ?? [])];
  const o2Logs = await seedWorkLogs(db, o2.allMemberIds, o2AllTaskIds, ORG2.workLogNotes);
  const o2Steps = await seedSteps(db, [jp1, jp2], ORG2.stepsByTask, o2.allMemberIds);
  console.log(`\n  tasks: ${o2AllTaskIds.length} | work logs: ${o2Logs} | steps: ${o2Steps}`);

  console.log("\n✓ Seed complete!\n");
  await pool.end();
  process.exit(0);
}

main().catch((err) => { console.error("Seed failed:", err); process.exit(1); });
