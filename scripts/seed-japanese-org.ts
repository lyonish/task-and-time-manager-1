/**
 * seed-japanese-org.ts
 *
 * Creates a fully independent Japanese tenant:
 *   - 1 new workspace (株式会社テクノビジョン)
 *   - 15 members with Japanese names
 *   - 2 projects with 25 tasks each (Condor/Eagle/Pigeon/Sparrow)
 *   - 14 days of work logs (weekday-heavy)
 *   - Steps on 8 tasks
 */
import { config } from "dotenv";
config({ path: ".env.local", override: false });

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as schema from "../src/lib/db/schema";

const {
  users,
  workspaces,
  workspaceMembers,
  projects,
  taskLayers,
  workflowStatuses,
  tasks,
  workLogs,
  steps,
} = schema;

// ── helpers ────────────────────────────────────────────────────────────────
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}
function isWeekend(d: Date) {
  return d.getDay() === 0 || d.getDay() === 6;
}

// ── members ────────────────────────────────────────────────────────────────
const MEMBERS = [
  { name: "田中 太郎",   email: "taro.tanaka@technovision.jp"   }, // owner
  { name: "佐藤 花子",   email: "hanako.sato@technovision.jp"   },
  { name: "鈴木 一郎",   email: "ichiro.suzuki@technovision.jp" },
  { name: "山田 美咲",   email: "misaki.yamada@technovision.jp" },
  { name: "伊藤 健太",   email: "kenta.ito@technovision.jp"     },
  { name: "渡辺 さくら", email: "sakura.watanabe@technovision.jp"},
  { name: "中村 大輔",   email: "daisuke.nakamura@technovision.jp"},
  { name: "小林 愛",     email: "ai.kobayashi@technovision.jp"  },
  { name: "加藤 翔",     email: "sho.kato@technovision.jp"      },
  { name: "吉田 雅子",   email: "masako.yoshida@technovision.jp"},
  { name: "山本 直樹",   email: "naoki.yamamoto@technovision.jp"},
  { name: "松本 由美",   email: "yumi.matsumoto@technovision.jp"},
  { name: "井上 拓也",   email: "takuya.inoue@technovision.jp"  },
  { name: "木村 明日香", email: "asuka.kimura@technovision.jp"  },
  { name: "林 浩二",     email: "koji.hayashi@technovision.jp"  },
];

// ── workflow statuses ──────────────────────────────────────────────────────
const DEFAULT_STATUSES = [
  { name: "未着手",     color: "#9ca3af", isDefault: true,  isCompleted: false },
  { name: "進行中",     color: "#3b82f6", isDefault: false, isCompleted: false },
  { name: "レビュー中", color: "#f59e0b", isDefault: false, isCompleted: false },
  { name: "完了",       color: "#22c55e", isDefault: false, isCompleted: true  },
];

const BIRDS = [
  { name: "Condor",  color: "#8b5cf6", position: 0 },
  { name: "Eagle",   color: "#3b82f6", position: 1 },
  { name: "Pigeon",  color: "#22c55e", position: 2 },
  { name: "Sparrow", color: "#9ca3af", position: 3 },
];

// ── work log notes (Japanese) ──────────────────────────────────────────────
const NOTES = [
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
];

// ── steps (per task title, Japanese) ──────────────────────────────────────
const STEPS_BY_TASK: Record<string, Array<{ title: string; status: string; done: boolean }>> = {
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
    { title: "ブランチ戦略の確認",               status: "完了",       done: true  },
    { title: "GitHub Actionsワークフロー作成",    status: "進行中",     done: false },
    { title: "本番デプロイ自動化",               status: "未着手",     done: false },
  ],
  "商品検索API": [
    { title: "検索要件定義",                     status: "完了",       done: true  },
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
    { title: "KPI指標の整理",                    status: "完了",       done: true  },
    { title: "ダッシュボードUIプロトタイプ",       status: "完了",       done: true  },
    { title: "リアルタイムデータ更新",             status: "レビュー中", done: false },
    { title: "エクスポート機能（Excel/PDF）",      status: "未着手",     done: false },
  ],
  "データパイプライン構築": [
    { title: "データソース調査・整理",            status: "完了",       done: true  },
    { title: "ETLジョブ実装",                    status: "進行中",     done: false },
    { title: "データ品質チェック自動化",           status: "未着手",     done: false },
  ],
  "シングルサインオン実装": [
    { title: "Azure AD連携の設計",               status: "完了",       done: true  },
    { title: "OAuth2フロー実装",                 status: "進行中",     done: false },
    { title: "セッション管理とログアウト処理",     status: "未着手",     done: false },
  ],
};

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 10,
  });
  const db = drizzle(pool, { schema, mode: "default" });

  const passwordHash = await bcrypt.hash("password123", 10);

  // ── 1. Create users ────────────────────────────────────────────────────
  console.log("\nCreating members...");
  const memberIds: string[] = [];

  for (const m of MEMBERS) {
    let user = await db.query.users.findFirst({
      where: eq(users.email, m.email),
      columns: { id: true },
    });
    if (user) {
      console.log(`  skip (exists): ${m.name}`);
    } else {
      const id = crypto.randomUUID();
      await db.insert(users).values({ id, email: m.email, name: m.name, passwordHash });
      user = { id };
      console.log(`  created: ${m.name}`);
    }
    memberIds.push(user.id);
  }

  const ownerId   = memberIds[0];
  const adminId   = memberIds[0];

  // ── 2. Create workspace ────────────────────────────────────────────────
  console.log("\nCreating workspace...");
  let workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.name, "株式会社テクノビジョン"),
    columns: { id: true },
  });
  if (workspace) {
    console.log("  skip (exists): 株式会社テクノビジョン");
  } else {
    const id = crypto.randomUUID();
    await db.insert(workspaces).values({
      id,
      name: "株式会社テクノビジョン",
      description: "テクノビジョン社内プロジェクト管理",
      ownerId,
    });
    workspace = { id };
    console.log("  created: 株式会社テクノビジョン");
  }
  const workspaceId = workspace.id;

  // ── 3. Add all members to workspace ───────────────────────────────────
  for (let i = 0; i < memberIds.length; i++) {
    const userId = memberIds[i];
    const role = i === 0 ? "Admin" : i <= 2 ? "Project_Manager" : "Team_Member";
    const exists = await db.query.workspaceMembers.findFirst({
      where: (wm, { and, eq: e }) =>
        and(e(wm.workspaceId, workspaceId), e(wm.userId, userId)),
    });
    if (!exists) {
      await db.insert(workspaceMembers).values({
        id: crypto.randomUUID(),
        workspaceId,
        userId,
        role,
      });
    }
  }
  console.log("  members added.");

  // ── project/task helpers ───────────────────────────────────────────────
  let taskPos = 2000;

  const setupProject = async (name: string, color: string) => {
    const projectId = crypto.randomUUID();
    await db.insert(projects).values({ id: projectId, workspaceId, name, color, createdBy: adminId });

    const statusMap: Record<string, string> = {};
    for (let i = 0; i < DEFAULT_STATUSES.length; i++) {
      const s = DEFAULT_STATUSES[i];
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
      await db.insert(taskLayers).values({ id, projectId, name: bird.name, color: bird.color, position: bird.position });
      layerMap[bird.name] = id;
    }

    return { projectId, statusMap, layerMap };
  };

  const taskIds: string[] = [];
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
      position: taskPos++, createdBy: adminId,
      assigneeId: assigneeId ?? null,
    });
    taskIds.push(id);
    return id;
  };

  const rm = () => pick(memberIds.slice(1)); // random non-owner member

  // ── 4. Project 1: ECサイトリニューアル ─────────────────────────────────
  console.log("\nCreating project: ECサイトリニューアル...");
  const { projectId: p1, statusMap: s1, layerMap: l1 } =
    await setupProject("ECサイトリニューアル", "#e11d48");

  // Condor: フロントエンド刷新
  const c1 = await addTask("フロントエンド刷新",          p1, l1.Condor, null, s1["進行中"], "High");
  const e1 = await addTask("デザインシステム構築",          p1, l1.Eagle,  c1,  s1["進行中"], "High",   rm());
  const pi1 = await addTask("コンポーネントライブラリ設計", p1, l1.Pigeon, e1,  s1["進行中"], "High",   rm());
  await addTask("ボタン・フォームコンポーネント",           p1, l1.Sparrow,pi1, s1["完了"],   "Medium", rm());
  await addTask("アイコンセット整備",                      p1, l1.Sparrow,pi1, s1["進行中"], "Low",    rm());
  await addTask("レスポンシブデザイン対応",                 p1, l1.Pigeon, e1,  s1["未着手"], "Medium", rm());
  await addTask("アクセシビリティ対応",                    p1, l1.Pigeon, e1,  s1["未着手"], "Medium", rm());
  const e2 = await addTask("ページ実装",                   p1, l1.Eagle,  c1,  s1["進行中"], "High",   rm());
  await addTask("トップページリデザイン",                  p1, l1.Pigeon, e2,  s1["レビュー中"],"Medium",rm());
  await addTask("商品一覧ページ",                          p1, l1.Pigeon, e2,  s1["未着手"], "Medium", rm());

  // Condor: バックエンド改修
  const c2 = await addTask("バックエンド改修",             p1, l1.Condor, null, s1["進行中"], "High");
  const e3 = await addTask("API設計・実装",                p1, l1.Eagle,  c2,  s1["進行中"], "High",   rm());
  const pi3 = await addTask("商品検索API",                 p1, l1.Pigeon, e3,  s1["進行中"], "High",   rm());
  await addTask("全文検索エンジン統合",                    p1, l1.Sparrow,pi3, s1["完了"],   "High",   rm());
  await addTask("フィルタリング機能",                      p1, l1.Sparrow,pi3, s1["進行中"], "Medium", rm());
  await addTask("カート・注文API",                         p1, l1.Pigeon, e3,  s1["未着手"], "High",   rm());
  await addTask("決済連携",                               p1, l1.Pigeon, e3,  s1["未着手"], "Urgent", rm());
  const e4 = await addTask("データベース最適化",           p1, l1.Eagle,  c2,  s1["未着手"], "Medium", rm());
  await addTask("クエリパフォーマンス改善",                p1, l1.Pigeon, e4,  s1["未着手"], "Medium", rm());
  await addTask("インデックス見直し",                      p1, l1.Pigeon, e4,  s1["未着手"], "Low",    rm());

  // Condor: インフラ整備
  const c3 = await addTask("インフラ整備",                 p1, l1.Condor, null, s1["進行中"], "Medium");
  const e5 = await addTask("CI/CD構築",                   p1, l1.Eagle,  c3,  s1["進行中"], "High",   rm());
  await addTask("GitHub Actions設定",                     p1, l1.Pigeon, e5,  s1["完了"],   "Medium", rm());
  const e6 = await addTask("監視・ログ基盤",               p1, l1.Eagle,  c3,  s1["未着手"], "Medium", rm());
  await addTask("エラー監視・アラート設定",                p1, l1.Pigeon, e6,  s1["未着手"], "Medium", rm());
  // 25 tasks ✓

  // ── 5. Project 2: 社内DXプラットフォーム ──────────────────────────────
  console.log("Creating project: 社内DXプラットフォーム...");
  const { projectId: p2, statusMap: s2, layerMap: l2 } =
    await setupProject("社内DXプラットフォーム", "#0891b2");

  // Condor: ワークフロー自動化
  const d1 = await addTask("ワークフロー自動化",           p2, l2.Condor, null, s2["進行中"], "High");
  const de1 = await addTask("承認フローエンジン",          p2, l2.Eagle,  d1,  s2["進行中"], "High",   rm());
  const dp1 = await addTask("申請フォームビルダー",        p2, l2.Pigeon, de1, s2["進行中"], "High",   rm());
  await addTask("条件分岐ロジック",                       p2, l2.Sparrow,dp1, s2["レビュー中"],"Medium",rm());
  await addTask("通知・リマインド機能",                    p2, l2.Sparrow,dp1, s2["未着手"], "Medium", rm());
  await addTask("承認履歴・監査ログ",                     p2, l2.Pigeon, de1, s2["未着手"], "Medium", rm());
  await addTask("モバイル対応",                           p2, l2.Pigeon, de1, s2["未着手"], "Low",    rm());
  const de2 = await addTask("外部システム連携",            p2, l2.Eagle,  d1,  s2["未着手"], "High",   rm());
  await addTask("勤怠システムAPI連携",                     p2, l2.Pigeon, de2, s2["未着手"], "High",   rm());
  await addTask("経費精算システム連携",                    p2, l2.Pigeon, de2, s2["未着手"], "Medium", rm());

  // Condor: データ分析基盤
  const d2 = await addTask("データ分析基盤",               p2, l2.Condor, null, s2["進行中"], "High");
  const de3 = await addTask("BIダッシュボード",            p2, l2.Eagle,  d2,  s2["進行中"], "High",   rm());
  await addTask("売上レポート自動生成",                    p2, l2.Pigeon, de3, s2["レビュー中"],"High", rm());
  await addTask("KPIモニタリング",                        p2, l2.Pigeon, de3, s2["進行中"], "Medium", rm());
  const de4 = await addTask("データパイプライン構築",      p2, l2.Eagle,  d2,  s2["進行中"], "High",   rm());
  const dp4 = await addTask("ETLジョブ設計",              p2, l2.Pigeon, de4, s2["完了"],   "High",   rm());
  await addTask("データウェアハウス設計",                  p2, l2.Pigeon, de4, s2["進行中"], "High",   rm());
  await addTask("データ品質チェック自動化",                p2, l2.Sparrow,dp4, s2["未着手"], "Medium", rm());

  // Condor: セキュリティ・認証
  const d3 = await addTask("セキュリティ・認証",           p2, l2.Condor, null, s2["進行中"], "Urgent");
  const de5 = await addTask("シングルサインオン実装",      p2, l2.Eagle,  d3,  s2["進行中"], "Urgent", rm());
  await addTask("Azure AD連携",                           p2, l2.Pigeon, de5, s2["レビュー中"],"High", rm());
  await addTask("ロールベースアクセス制御",                p2, l2.Pigeon, de5, s2["進行中"], "High",   rm());
  const de6 = await addTask("脆弱性診断対応",             p2, l2.Eagle,  d3,  s2["未着手"], "High",   rm());
  await addTask("ペネトレーションテスト",                  p2, l2.Pigeon, de6, s2["未着手"], "High",   rm());
  await addTask("セキュリティポリシー整備",                p2, l2.Pigeon, de6, s2["未着手"], "Medium", rm());
  // 25 tasks ✓

  console.log(`  created ${taskIds.length} tasks across 2 projects.`);

  // ── 6. Work logs: 14 days ──────────────────────────────────────────────
  console.log("\nCreating 14-day work logs...");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - 13 + i);
    return d;
  });

  let logCount = 0;
  for (const userId of memberIds) {
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
          userId,
          taskId: pick(taskIds),
          startTime,
          endTime,
          note: pick(NOTES),
        });
        logCount++;

        const nextStart = new Date(endTime);
        nextStart.setMinutes(nextStart.getMinutes() + pick([15, 15, 30]));
        hour   = nextStart.getHours();
        minute = nextStart.getMinutes();
      }
    }
  }
  console.log(`  created ${logCount} work log entries.`);

  // ── 7. Steps ───────────────────────────────────────────────────────────
  console.log("\nAdding steps...");

  // Fetch status maps for both projects
  const buildStatusMap = async (projectId: string) => {
    const rows = await db.query.workflowStatuses.findMany({
      where: eq(workflowStatuses.projectId, projectId),
      columns: { id: true, name: true },
    });
    return Object.fromEntries(rows.map((r) => [r.name, r.id]));
  };

  const p1StatusMap = await buildStatusMap(p1);
  const p2StatusMap = await buildStatusMap(p2);

  const allNewTasks = await db.query.tasks.findMany({
    where: (t, { inArray: inArr }) => inArr(t.projectId, [p1, p2]),
    columns: { id: true, title: true, projectId: true },
  });

  for (const task of allNewTasks) {
    const defs = STEPS_BY_TASK[task.title];
    if (!defs) continue;

    const statusMap = task.projectId === p1 ? p1StatusMap : p2StatusMap;

    for (let pos = 0; pos < defs.length; pos++) {
      const def = defs[pos];
      const statusId = statusMap[def.status];
      if (!statusId) continue;

      await db.insert(steps).values({
        id: crypto.randomUUID(),
        taskId: task.id,
        statusId,
        title: def.title,
        position: pos,
        isCompleted: def.done,
        assigneeId: pick(memberIds),
      });
    }
    console.log(`  "${task.title}" → ${defs.length} steps`);
  }

  console.log("\nJapanese org seed complete!");
  console.log(`  Workspace : 株式会社テクノビジョン`);
  console.log(`  Members   : ${memberIds.length}`);
  console.log(`  Tasks     : ${taskIds.length}`);
  console.log(`  Work logs : ${logCount}`);
  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
