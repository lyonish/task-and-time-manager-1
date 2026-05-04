/**
 * Seed planning sample data for 株式会社テクノビジョン
 * - 3 teams + group memberships
 * - Custom capacities for some members
 * - Planned assignments Feb–Jul 2026 across 2 projects
 *
 * Run: npx tsx scripts/seed-planning-data.ts
 */
import { config } from "dotenv";
config({ path: ".env.local", override: false });
import mysql from "mysql2/promise";

const WS = "a7ce2085-9986-4424-b2b2-9025747d6b01";

// Members
const M = {
  tanaka:    "0c9313a5-2575-4146-b6df-3beed3e3f21b", // 田中 太郎  — lead dev
  sato:      "81a51b9f-5312-4e8c-8a79-29bbcd8abf2e", // 佐藤 花子  — PM
  suzuki:    "0071c901-9832-46b4-86d8-a37dd74b4232", // 鈴木 一郎  — engineering mgr
  watanabe:  "d7e74736-5713-48eb-b1ae-8de94c624359", // 渡辺 さくら — frontend dev
  kobayashi: "6ed79bfe-781f-472a-93d1-6e5f6f134230", // 小林 愛    — design lead
  yamamoto:  "023ad431-e15f-4467-8704-1826e38649ca", // 山本 直樹  — fullstack dev
  kimura:    "4a3e0d99-7227-47a3-a259-98a52e8e70e2", // 木村 明日香 — UI/UX
  hayashi:   "4ffab536-9bda-44ab-b7d8-634e9dd10d4c", // 林 浩二    — PM
  yamada:    "da5f1936-a104-48c6-b869-3aa1ac77a9ff", // 山田 美咲  — backend dev
  nakamura:  "0cc41921-e4a7-45ff-8cf4-218fdd55bbf1", // 中村 大輔  — backend dev
  inoue:     "2882d859-a18b-45f8-9c9c-44edcdb8b69b", // 井上 拓也  — frontend dev
  ito:       "fdb30b5b-4f0e-4cb0-b842-6cb74b9e4e91", // 伊藤 健太  — QA
  yoshida:   "d7ca37b2-24d4-4615-b526-384e08a8c90d", // 吉田 雅子  — designer
  kato:      "ec8e2995-230c-4c70-8207-f47dea3a9af8", // 加藤 翔    — backend dev
  matsumoto: "0c0df7e4-535a-4d96-a148-2f997c6e945a", // 松本 由美  — designer
};

// Projects
const P = {
  ec:  "38e48a53-3460-42c3-a56a-46da24d7c435", // ECサイトリニューアル
  dx:  "cdeef5a3-737e-4742-95de-f8d4a38992f2", // 社内DXプラットフォーム
};

// Existing groups
const G_EXISTING_DEV = "d52cf733-853c-4d08-abee-613e5d4f65cc"; // 開発チーム

function uuid() {
  return crypto.randomUUID();
}

async function main() {
  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL!,
    charset: "utf8mb4_0900_ai_ci",
  });

  // ── 1. Create 2 new groups ──────────────────────────────────────────────────

  const gDesign = uuid();
  const gPmo    = uuid();

  await conn.execute(
    `INSERT INTO user_groups (id, workspace_id, name, is_default) VALUES (?, ?, ?, 0), (?, ?, ?, 0)`,
    [gDesign, WS, "デザイン・UXチーム", gPmo, WS, "PMO・QAチーム"]
  );
  console.log("Groups created.");

  // ── 2. Assign group members ─────────────────────────────────────────────────

  // 開発チーム: 田中(Leader), 山本, 中村, 井上, 渡辺, 山田, 加藤
  const devMembers: [string, string, string][] = [
    [G_EXISTING_DEV, M.tanaka,   "Leader"],
    [G_EXISTING_DEV, M.yamamoto, "Member"],
    [G_EXISTING_DEV, M.nakamura, "Member"],
    [G_EXISTING_DEV, M.inoue,    "Member"],
    [G_EXISTING_DEV, M.watanabe, "Member"],
    [G_EXISTING_DEV, M.yamada,   "Member"],
    [G_EXISTING_DEV, M.kato,     "Member"],
  ];

  // デザイン・UXチーム: 小林(Leader), 木村, 吉田, 松本
  const designMembers: [string, string, string][] = [
    [gDesign, M.kobayashi, "Leader"],
    [gDesign, M.kimura,    "Member"],
    [gDesign, M.yoshida,   "Member"],
    [gDesign, M.matsumoto, "Member"],
  ];

  // PMO・QAチーム: 佐藤(Leader), 林, 伊藤
  const pmoMembers: [string, string, string][] = [
    [gPmo, M.sato,    "Leader"],
    [gPmo, M.hayashi, "Member"],
    [gPmo, M.ito,     "Member"],
  ];

  const allGroupMembers = [...devMembers, ...designMembers, ...pmoMembers];
  for (const [groupId, userId, role] of allGroupMembers) {
    await conn.execute(
      `INSERT IGNORE INTO user_group_members (id, group_id, user_id, role) VALUES (?, ?, ?, ?)`,
      [uuid(), groupId, userId, role]
    );
  }
  console.log("Group members assigned.");

  // ── 3. Set non-default capacities ──────────────────────────────────────────

  const capacities: [string, number, number][] = [
    [M.sato,      6, 5], // PM: meetings eat into dev time
    [M.kobayashi, 7, 5], // design lead
    [M.hayashi,   7, 5], // PM
    [M.ito,       8, 4], // QA: 4-day week
    [M.suzuki,    4, 5], // eng mgr: half-time IC
  ];

  for (const [userId, hpd, dpw] of capacities) {
    await conn.execute(
      `INSERT INTO user_capacity (id, user_id, workspace_id, hours_per_day, days_per_week)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE hours_per_day = VALUES(hours_per_day), days_per_week = VALUES(days_per_week)`,
      [uuid(), userId, WS, hpd, dpw]
    );
  }
  console.log("Capacities set.");

  // ── 4. Planned assignments ──────────────────────────────────────────────────
  // Format: [userId, projectId|null, title, startDate, endDate, estimatedHours]

  type PA = [string, string | null, string, string, string, number];

  const assignments: PA[] = [
    // ── ECサイトリニューアル ─────────────────────────────────────────────────

    // 佐藤 花子 (PM)
    [M.sato,    P.ec, "要件定義・プロジェクト計画",   "2026-02-02", "2026-03-27", 120],
    [M.sato,    P.ec, "リリース準備・品質管理",        "2026-06-01", "2026-07-31",  80],

    // 林 浩二 (PM support)
    [M.hayashi, P.ec, "要件定義サポート",              "2026-02-02", "2026-03-13",  60],
    [M.hayashi, P.ec, "ステークホルダー調整",          "2026-05-01", "2026-07-31", 100],

    // 小林 愛 (design lead)
    [M.kobayashi, P.ec, "UIデザイン - トップ・商品一覧", "2026-02-02", "2026-03-31", 120],
    [M.kobayashi, P.ec, "コンポーネントデザイン",        "2026-04-01", "2026-05-29", 100],

    // 木村 明日香 (UI/UX)
    [M.kimura, P.ec, "モバイルUI設計",  "2026-02-16", "2026-04-30", 140],
    [M.kimura, P.ec, "デザインQA",      "2026-06-01", "2026-07-15",  60],

    // 井上 拓也 (frontend)
    [M.inoue, P.ec, "フロントエンド基盤構築",          "2026-03-02", "2026-04-30", 120],
    [M.inoue, P.ec, "EC機能実装（商品・カート）",      "2026-05-01", "2026-06-30", 160],

    // 渡辺 さくら (frontend)
    [M.watanabe, P.ec, "LP・静的ページ実装",           "2026-03-16", "2026-04-30",  80],
    [M.watanabe, P.ec, "検索・フィルター機能実装",     "2026-05-01", "2026-07-15", 140],

    // 田中 太郎 (backend lead)
    [M.tanaka, P.ec, "API設計・DB設計",                "2026-03-02", "2026-04-15", 100],
    [M.tanaka, P.ec, "商品管理API開発",                "2026-04-16", "2026-06-30", 160],

    // 中村 大輔 (backend)
    [M.nakamura, P.ec, "認証・会員管理API",            "2026-03-16", "2026-05-29", 140],
    [M.nakamura, P.ec, "決済・注文API",                "2026-06-01", "2026-07-31", 120],

    // 伊藤 健太 (QA)
    [M.ito, P.ec, "テスト計画策定",    "2026-05-01", "2026-05-29",  60],
    [M.ito, P.ec, "総合テスト実施",    "2026-06-01", "2026-07-15", 120],

    // ── 社内DXプラットフォーム ───────────────────────────────────────────────

    // 吉田 雅子 (designer)
    [M.yoshida, P.dx, "管理画面プロトタイプ",          "2026-02-02", "2026-03-31", 100],
    [M.yoshida, P.dx, "UIコンポーネント仕様書",        "2026-04-01", "2026-05-29",  80],

    // 松本 由美 (designer)
    [M.matsumoto, P.dx, "ダッシュボードデザイン",      "2026-02-16", "2026-04-30", 120],
    [M.matsumoto, P.dx, "ユーザーテスト・改善",        "2026-05-01", "2026-06-30",  80],

    // 山本 直樹 (fullstack)
    [M.yamamoto, P.dx, "認証基盤・権限管理API",        "2026-04-01", "2026-05-29", 140],
    [M.yamamoto, P.dx, "管理画面フロントエンド",       "2026-06-01", "2026-07-31", 120],

    // 加藤 翔 (backend)
    [M.kato, P.dx, "データ連携API",                    "2026-04-16", "2026-06-30", 130],
    [M.kato, P.dx, "通知・レポート機能",               "2026-07-01", "2026-07-31",  60],

    // 山田 美咲 (backend)
    [M.yamada, P.dx, "データ基盤設計・ETL構築",        "2026-05-01", "2026-06-30", 140],
    [M.yamada, P.dx, "分析ダッシュボードAPI",          "2026-07-01", "2026-07-31",  60],

    // ── カスタム（プロジェクト外）───────────────────────────────────────────

    // 鈴木 一郎 — ongoing management
    [M.suzuki, null, "マネジメント・1on1・採用",        "2026-02-02", "2026-07-31", 160],

    // 田中 太郎 — stacks on top of EC work to demo overlap
    [M.tanaka, null, "採用活動・面接対応",              "2026-05-01", "2026-06-30",  40],

    // 山本 直樹 — stacks on DX work
    [M.yamamoto, null, "採用面接・技術評価",            "2026-06-16", "2026-07-15",  30],

    // 林 浩二 — 上期振り返り & 下期計画
    [M.hayashi, null, "上期振り返り・下期計画策定",    "2026-06-16", "2026-07-15",  40],
  ];

  for (const [userId, projectId, title, startDate, endDate, estimatedHours] of assignments) {
    await conn.execute(
      `INSERT INTO planned_assignments
         (id, workspace_id, user_id, project_id, title, start_date, end_date, estimated_hours, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuid(), WS, userId, projectId, title, startDate, endDate, estimatedHours.toFixed(2), M.sato]
    );
  }
  console.log(`${assignments.length} planned assignments inserted.`);

  await conn.end();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
