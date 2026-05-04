/**
 * Seed work logs for Feb–Apr 2026 (past 3 months)
 * 10:00–19:00 JST (= 01:00–10:00 UTC), occasional overtime
 *
 * Run: npx tsx scripts/seed-work-logs.ts
 */
import { config } from "dotenv";
config({ path: ".env.local", override: false });
import mysql from "mysql2/promise";

// ── Constants ────────────────────────────────────────────────────────────────

const WS_ID = "a7ce2085-9986-4424-b2b2-9025747d6b01";

// Members
const M = {
  tanaka:    "0c9313a5-2575-4146-b6df-3beed3e3f21b", // 田中 太郎  — backend lead
  sato:      "81a51b9f-5312-4e8c-8a79-29bbcd8abf2e", // 佐藤 花子  — PM
  suzuki:    "0071c901-9832-46b4-86d8-a37dd74b4232", // 鈴木 一郎  — eng mgr
  watanabe:  "d7e74736-5713-48eb-b1ae-8de94c624359", // 渡辺 さくら — frontend
  kobayashi: "6ed79bfe-781f-472a-93d1-6e5f6f134230", // 小林 愛    — design lead
  yamamoto:  "023ad431-e15f-4467-8704-1826e38649ca", // 山本 直樹  — fullstack
  kimura:    "4a3e0d99-7227-47a3-a259-98a52e8e70e2", // 木村 明日香 — UI/UX
  hayashi:   "4ffab536-9bda-44ab-b7d8-634e9dd10d4c", // 林 浩二    — PM
  yamada:    "da5f1936-a104-48c6-b869-3aa1ac77a9ff", // 山田 美咲  — backend
  nakamura:  "0cc41921-e4a7-45ff-8cf4-218fdd55bbf1", // 中村 大輔  — backend
  inoue:     "2882d859-a18b-45f8-9c9c-44edcdb8b69b", // 井上 拓也  — frontend
  ito:       "fdb30b5b-4f0e-4cb0-b842-6cb74b9e4e91", // 伊藤 健太  — QA
  yoshida:   "d7ca37b2-24d4-4615-b526-384e08a8c90d", // 吉田 雅子  — designer
  kato:      "ec8e2995-230c-4c70-8207-f47dea3a9af8", // 加藤 翔    — backend
  matsumoto: "0c0df7e4-535a-4d96-a148-2f997c6e945a", // 松本 由美  — designer
};

// Tasks (ECサイトリニューアル)
const T_EC = {
  apiDesign:       "d9b22ee2-f116-4fba-aa52-53a0153750c2",
  cartOrderApi:    "0e2a5432-6c22-419a-b4c8-e6f2203c189e",
  searchApi:       "6365c8be-fc04-43e8-a844-2e031373c928",
  dbOptimize:      "9ef93ca2-d70f-403e-a357-35d83af4b4dc",
  queryPerf:       "9d36804e-92fa-4190-8bf0-3267219b32b4",
  payment:         "10dd2f90-827e-4e03-bfbc-7d0b2860472e",
  backendRefactor: "32a6f6ed-c5e2-4647-81e4-a6bb6923753a",
  frontendRevamp:  "57451f51-4295-44b5-8c94-ffc85a9b3457",
  pageImpl:        "8e33dd6f-4bbf-4e19-a124-cd1848ff8639",
  responsive:      "df53c8a6-02c6-49d2-a6a9-1db0e007d170",
  filtering:       "411d6d8e-8a55-45b5-95f0-7f4783d2e8f4",
  productList:     "c0611edd-55f0-4f1d-83e7-7cde032840b5",
  topPageRedesign: "310a40a3-29d0-44e4-a0c7-2cf5b22b9282",
  componentLib:    "0e61723c-6136-4486-a4bf-b76c89614af7",
  designSystem:    "967c5e23-da7a-4e18-b1a8-14c37d8a657a",
  a11y:            "285968b3-b35a-4723-a3da-8c0ff76b369d",
  buttonForm:      "78ead64c-8ee6-4d60-972d-5463eeae3215",
  cicd:            "aa0a2de7-149f-4dd8-a105-35a4f875a503",
  githubActions:   "98ce9445-005d-4300-a1ef-46c35305a2d9",
  iconset:         "ec491ae3-20ec-472a-a3cf-0cd14bf9bbf2",
  monitoring:      "eaddb194-de11-4824-89f6-7c0a44177a78",
  errorAlert:      "e39ea739-9e6f-4cb5-8ecd-d6d91b975bb5",
  fullTextSearch:  "c0f5e973-28b2-4d9b-8895-286748bfaeb9",
  infra:           "45e47d09-b050-4e19-8a59-5018594fd0d2",
};

// Tasks (社内DXプラットフォーム)
const T_DX = {
  auth:          "34cbe6b4-e833-450a-b151-82de3982e48a",
  sso:           "909a7449-08b5-4c53-b374-37908d0d3ae4",
  dataAnalysis:  "29a34f1c-d4e8-4bec-b240-1aae9b458246",
  etl:           "209e753e-7dba-47fa-a03a-fd946b7b8018",
  pipeline:      "754d2608-2f62-448d-be1a-f8107fb2f1c4",
  dwh:           "57ca6efd-66bd-4d73-82ac-6f008a4aa402",
  dataQuality:   "6ff2c7a0-b9ae-4b53-82d8-85700ca93556",
  kpi:           "3b979c53-7304-4c81-9d5c-2ab97c73e3e1",
  workflow:      "413448ab-7ac5-4d5f-a098-bd7ad8d752da",
  approval:      "10e7caeb-ae6d-415b-a956-2b8e75ad26e9",
  branchLogic:   "827655cb-6a88-4f44-a2ce-8ad9928fe091",
  pentest:       "564778b0-9e33-4a15-abfd-565a00312390",
  vulnDiag:      "7c27ad0f-2a06-4882-9822-cca68ea20d0b",
  mobile:        "8d3cc8ca-4b93-4ff3-8431-650edc7fbd33",
};

// ── Member work profiles ──────────────────────────────────────────────────────

interface MemberProfile {
  userId: string;
  tasks: string[];         // task IDs to cycle through
  actionTypes: string[];   // action_type values
  morningNotes: string[];
  afternoonNotes: string[];
  overtimeRate: number;    // 0–1 probability of overtime
}

const profiles: MemberProfile[] = [
  {
    userId: M.tanaka,
    tasks: [T_EC.apiDesign, T_EC.dbOptimize, T_EC.queryPerf, T_EC.searchApi, T_EC.backendRefactor],
    actionTypes: ["Coding", "Coding", "Review"],
    morningNotes: ["API設計・実装", "DBスキーマ設計", "コードレビュー", "実装作業"],
    afternoonNotes: ["バックエンド実装", "パフォーマンスチューニング", "PRレビュー", "デバッグ"],
    overtimeRate: 0.3,
  },
  {
    userId: M.sato,
    tasks: [T_EC.iconset, T_EC.apiDesign, T_DX.workflow, T_DX.kpi],
    actionTypes: ["Planning", "Meeting", "Review"],
    morningNotes: ["スプリント計画", "バックログ整理", "進捗確認MTG", "要件定義"],
    afternoonNotes: ["ステークホルダーMTG", "ドキュメント整理", "リスク管理", "チームMTG"],
    overtimeRate: 0.2,
  },
  {
    userId: M.suzuki,
    tasks: [T_EC.fullTextSearch, T_EC.cicd, T_EC.infra, T_DX.auth],
    actionTypes: ["Meeting", "Review", "Planning"],
    morningNotes: ["アーキテクチャレビュー", "1on1", "採用面接", "技術方針検討"],
    afternoonNotes: ["チーム全体MTG", "技術レビュー", "ロードマップ整理", "採用候補者評価"],
    overtimeRate: 0.1,
  },
  {
    userId: M.watanabe,
    tasks: [T_EC.responsive, T_EC.filtering, T_EC.productList, T_EC.pageImpl],
    actionTypes: ["Coding", "Coding", "Review"],
    morningNotes: ["フロントエンド実装", "レスポンシブ対応", "コンポーネント実装"],
    afternoonNotes: ["UI実装", "スタイル調整", "コードレビュー", "デバッグ"],
    overtimeRate: 0.25,
  },
  {
    userId: M.kobayashi,
    tasks: [T_EC.topPageRedesign, T_EC.componentLib, T_EC.designSystem, T_EC.a11y],
    actionTypes: ["Design", "Design", "Review"],
    morningNotes: ["デザイン作業", "Figmaプロトタイプ", "コンポーネント設計"],
    afternoonNotes: ["デザインレビュー", "スタイルガイド整備", "UIブラッシュアップ", "デザインQA"],
    overtimeRate: 0.2,
  },
  {
    userId: M.yamamoto,
    tasks: [T_DX.auth, T_DX.sso, T_DX.dataAnalysis, T_EC.frontendRevamp],
    actionTypes: ["Coding", "Coding", "Review"],
    morningNotes: ["認証基盤実装", "API実装", "フルスタック開発"],
    afternoonNotes: ["セキュリティ実装", "コードレビュー", "テスト実装", "PRマージ対応"],
    overtimeRate: 0.3,
  },
  {
    userId: M.kimura,
    tasks: [T_EC.designSystem, T_EC.a11y, T_EC.buttonForm, T_DX.mobile],
    actionTypes: ["Design", "Design", "Review"],
    morningNotes: ["UIデザイン", "Figma作業", "モバイルUI設計"],
    afternoonNotes: ["デザインシステム更新", "プロトタイプ修正", "ユーザビリティ確認", "デザインレビュー"],
    overtimeRate: 0.15,
  },
  {
    userId: M.hayashi,
    tasks: [T_EC.iconset, T_EC.apiDesign, T_DX.workflow, T_DX.approval],
    actionTypes: ["Planning", "Meeting", "Review"],
    morningNotes: ["バックログ整理", "スプリント計画", "要件整理"],
    afternoonNotes: ["ステークホルダー調整", "進捗確認", "ドキュメント作成", "MTG議事録"],
    overtimeRate: 0.15,
  },
  {
    userId: M.yamada,
    tasks: [T_DX.etl, T_DX.pipeline, T_DX.dwh, T_DX.dataQuality],
    actionTypes: ["Coding", "Coding", "Review"],
    morningNotes: ["ETLジョブ実装", "データパイプライン構築", "クエリ最適化"],
    afternoonNotes: ["データ基盤整備", "バッチ処理実装", "データ品質チェック", "コードレビュー"],
    overtimeRate: 0.25,
  },
  {
    userId: M.nakamura,
    tasks: [T_EC.cartOrderApi, T_EC.backendRefactor, T_EC.payment, T_EC.apiDesign],
    actionTypes: ["Coding", "Coding", "Review"],
    morningNotes: ["バックエンドAPI実装", "決済API対応", "会員管理API"],
    afternoonNotes: ["APIテスト", "コードレビュー", "デバッグ", "ドキュメント更新"],
    overtimeRate: 0.3,
  },
  {
    userId: M.inoue,
    tasks: [T_EC.frontendRevamp, T_EC.pageImpl, T_EC.responsive, T_EC.filtering],
    actionTypes: ["Coding", "Coding", "Review"],
    morningNotes: ["フロントエンド実装", "React コンポーネント開発", "UI実装"],
    afternoonNotes: ["スタイル実装", "E2Eテスト", "コードレビュー", "パフォーマンス改善"],
    overtimeRate: 0.35,
  },
  {
    userId: M.ito,
    tasks: [T_DX.pentest, T_DX.vulnDiag, T_EC.monitoring, T_EC.errorAlert],
    actionTypes: ["Testing", "Testing", "Review"],
    morningNotes: ["テストケース作成", "セキュリティ診断", "テスト実施"],
    afternoonNotes: ["バグ報告・トリアージ", "リグレッションテスト", "テスト自動化", "レポート作成"],
    overtimeRate: 0.2,
  },
  {
    userId: M.yoshida,
    tasks: [T_DX.mobile, T_DX.kpi, T_DX.workflow, T_EC.componentLib],
    actionTypes: ["Design", "Design", "Review"],
    morningNotes: ["管理画面UI設計", "ダッシュボードデザイン", "Figma作業"],
    afternoonNotes: ["プロトタイプ作成", "UIコンポーネント整備", "デザインレビュー", "仕様書更新"],
    overtimeRate: 0.15,
  },
  {
    userId: M.kato,
    tasks: [T_DX.approval, T_DX.workflow, T_DX.branchLogic, T_EC.backendRefactor],
    actionTypes: ["Coding", "Coding", "Review"],
    morningNotes: ["API実装", "ワークフローエンジン開発", "バックエンド実装"],
    afternoonNotes: ["ロジック実装", "単体テスト", "コードレビュー", "デバッグ"],
    overtimeRate: 0.25,
  },
  {
    userId: M.matsumoto,
    tasks: [T_DX.kpi, T_DX.dataQuality, T_DX.mobile, T_EC.designSystem],
    actionTypes: ["Design", "Design", "Review"],
    morningNotes: ["ダッシュボードデザイン", "データビジュアライゼーション設計", "UIデザイン"],
    afternoonNotes: ["ユーザーテスト準備", "Figmaコンポーネント", "デザインQA", "仕様書作成"],
    overtimeRate: 0.15,
  },
];

// ── Date helpers ──────────────────────────────────────────────────────────────

function isWeekend(d: Date): boolean {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

function workdaysInRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    if (!isWeekend(cur)) days.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

// Build a UTC timestamp string for a given date (YYYY-MM-DD) + JST hour + minute
function jstToUtc(dateStr: string, jstHour: number, jstMin: number): string {
  // JST = UTC+9, so subtract 9 hours
  let utcHour = jstHour - 9;
  let dayOffset = 0;
  if (utcHour < 0) { utcHour += 24; dayOffset = -1; }
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(utcHour, jstMin, 0, 0);
  return d.toISOString().replace("T", " ").replace(/\.\d+Z$/, "");
}

// Deterministic pick (no true randomness — reproducible seed)
function pick<T>(arr: T[], seed: number): T {
  return arr[((seed % arr.length) + arr.length) % arr.length];
}

// ── Daily schedule variants (JST) ────────────────────────────────────────────
// Each variant: [morningStart, morningEnd, afternoonStart, afternoonEnd, overtimeEnd|null]
// All in [hour, minute] pairs

type TimeSlot = [number, number];
interface DayVariant {
  am: [TimeSlot, TimeSlot];
  pm: [TimeSlot, TimeSlot];
  ot?: [TimeSlot, TimeSlot];
}

const DAY_VARIANTS: DayVariant[] = [
  { am: [[10,  0], [12, 30]], pm: [[13, 30], [18, 30]] },          // 7.5h
  { am: [[10,  0], [13,  0]], pm: [[14,  0], [19,  0]] },          // 8h
  { am: [[10,  0], [12, 30]], pm: [[13, 30], [19,  0]] },          // 8h
  { am: [[10, 15], [13,  0]], pm: [[14,  0], [18, 30]] },          // 7.25h
  { am: [[10,  0], [12, 30]], pm: [[13, 30], [18,  0]] },          // 7h
  { am: [[10,  0], [13,  0]], pm: [[14,  0], [18, 30]] },          // 7.5h
  { am: [[10, 30], [13,  0]], pm: [[14,  0], [19,  0]] },          // 7.5h
  // overtime variants
  { am: [[10,  0], [12, 30]], pm: [[13, 30], [19,  0]], ot: [[19, 30], [21,  0]] }, // 9h
  { am: [[10,  0], [13,  0]], pm: [[14,  0], [19,  0]], ot: [[19, 30], [20, 30]] }, // 8.5h
  { am: [[10,  0], [12, 30]], pm: [[13, 30], [19,  0]], ot: [[19, 30], [22,  0]] }, // 10h
];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL!,
    charset: "utf8mb4_0900_ai_ci",
  });

  const start = new Date("2026-02-02T00:00:00Z");
  const end   = new Date("2026-04-30T00:00:00Z");
  const workdays = workdaysInRange(start, end);

  const rows: string[] = [];

  for (let di = 0; di < workdays.length; di++) {
    const day = workdays[di];
    const dateStr = day.toISOString().slice(0, 10);

    for (let pi = 0; pi < profiles.length; pi++) {
      const profile = profiles[pi];
      const seed = di * 31 + pi * 7;

      // Pick day variant; only use overtime variants if random threshold met
      const normalVariants = DAY_VARIANTS.slice(0, 7);
      const overtimeVariants = DAY_VARIANTS.slice(7);
      const useOvertime = (seed % 10) < Math.round(profile.overtimeRate * 10);
      const variant = useOvertime
        ? pick(overtimeVariants, seed)
        : pick(normalVariants, seed);

      const task1 = pick(profile.tasks, seed);
      const task2 = pick(profile.tasks, seed + 3);
      const task3 = pick(profile.tasks, seed + 5);
      const action1 = pick(profile.actionTypes, seed);
      const action2 = pick(profile.actionTypes, seed + 2);
      const action3 = pick(profile.actionTypes, seed + 4);
      const note1 = pick(profile.morningNotes, seed);
      const note2 = pick(profile.afternoonNotes, seed + 1);
      const note3 = pick(profile.afternoonNotes, seed + 6);

      const amStart = jstToUtc(dateStr, variant.am[0][0], variant.am[0][1]);
      const amEnd   = jstToUtc(dateStr, variant.am[1][0], variant.am[1][1]);
      const pmStart = jstToUtc(dateStr, variant.pm[0][0], variant.pm[0][1]);
      const pmEnd   = jstToUtc(dateStr, variant.pm[1][0], variant.pm[1][1]);

      const id1 = crypto.randomUUID();
      const id2 = crypto.randomUUID();

      rows.push(
        `('${id1}','${profile.userId}','${task1}','${amStart}','${amEnd}','${note1}','${action1}')`,
        `('${id2}','${profile.userId}','${task2}','${pmStart}','${pmEnd}','${note2}','${action2}')`
      );

      if (variant.ot) {
        const otStart = jstToUtc(dateStr, variant.ot[0][0], variant.ot[0][1]);
        const otEnd   = jstToUtc(dateStr, variant.ot[1][0], variant.ot[1][1]);
        const idOt = crypto.randomUUID();
        rows.push(
          `('${idOt}','${profile.userId}','${task3}','${otStart}','${otEnd}','${note3}','${action3}')`
        );
      }
    }
  }

  // Insert in batches of 200
  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await conn.execute(
      `INSERT INTO work_logs (id, user_id, task_id, start_time, end_time, note, action_type) VALUES ${batch.join(",")}`
    );
    inserted += batch.length;
    process.stdout.write(`\r  inserted ${inserted}/${rows.length}`);
  }

  console.log(`\n${rows.length} work log entries inserted across ${workdays.length} workdays.`);
  await conn.end();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
