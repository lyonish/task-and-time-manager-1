/**
 * Seed sample data for Nishimura1's Workspace
 * - 2 teams, custom capacities
 * - Planned assignments Feb–Jul 2026
 * - Work logs Feb–Apr 2026
 *
 * Run: npx tsx scripts/seed-nishimura-workspace.ts
 */
import { config } from "dotenv";
config({ path: ".env.local", override: false });
import mysql from "mysql2/promise";

const WS = "59488ada-5872-436e-9f2e-284cd8f65383";

const M = {
  alex:     "e9ecd6d3-445c-4f9d-8a5c-6efeb08cb993", // Alex Rivera     — PM/Lead
  alice:    "5c9e614a-e2d2-4f8c-bcef-02257462a19e", // Alice Chen      — Frontend
  liam:     "6d36ea6c-759b-4941-9ba7-ad4a48638728", // Liam Anderson   — Backend
  kate:     "0645ed69-2bca-4dd9-a5d3-5695ea848d01", // Kate Thompson   — Designer
  david:    "4d770a50-279a-4f64-8e15-8b282910d799", // David Patel     — Backend
  emma:     "5c946e6e-abb3-42ad-80c1-a294fa6d591b", // Emma Johnson    — Frontend
  henry:    "605f3cee-d2b5-4408-9a64-14ff5ee9193a", // Henry Brown     — QA
  james:    "3a19b9a8-50b2-476c-8f30-ea0de4fcfe1d", // James Wilson    — Fullstack
  grace:    "cfc1663b-f983-44ab-a4b7-cad545324a74", // Grace Liu       — Designer
  noah:     "ecd67dc2-5a2a-4099-9c56-e2fb1f2f9d46", // Noah Taylor     — Backend
  maya:     "9e79e810-51bf-40e7-a113-8b8c0b42ada9", // Maya Rodriguez  — Data Eng
  bob:      "5e176966-6141-4f53-a3a5-deef4a4cc037", // Bob Martinez    — Frontend
  frank:    "71e7cab8-13cb-4c74-a356-8c2a37074811", // Frank Nguyen    — Backend
  isabella: "d874a09c-d2c2-47b8-8f49-2bf7ca4ea5b0", // Isabella Davis  — Data Analyst
  carol:    "c11d2754-9553-45c7-a669-b12ecf474a7d", // Carol Kim       — QA
};

const P = {
  ec:  "42f1286a-6cda-44ac-8263-794ce0d85eeb", // E-Commerce Platform
  da:  "1dff4915-2069-4971-97fe-f664a4cbdec9", // Data Analytics Dashboard
};

// E-Commerce tasks
const T_EC = {
  productDetail:  "83cd93e0-c3e0-4824-b032-5191e787864e",
  productMgmt:    "86c07766-6372-4456-bf75-cf36cbe6d55a",
  searchFilter:   "8cbf128b-b4b0-47db-b119-6a2ff24c2621",
  searchUI:       "75edf036-1033-4f9b-a4ee-e7a712a68199",
  cart:           "4b52fdfe-2f82-415d-9b33-a36a87a6b250",
  cartPersist:    "4b8e6cc5-6427-4d2b-bbb0-f3afefa07409",
  cartItems:      "8ca5c638-9519-4c04-82e1-c59a9d82e651",
  checkout:       "6636602c-0e84-43ce-8e48-a846a2a63f37",
  shipping:       "55b5fa1e-458c-4503-a117-621ef5da8a1a",
  orderEmail:     "4fa30219-36ae-41b6-a25a-91424b32763f",
  payment:        "3aec8078-fee4-4ae9-99d8-3b26bdb57c48",
  addressApi:     "44acf472-5927-4564-99d1-2a9973846fb6",
  adminDash:      "6da973fe-04f6-41ce-b391-579f030f2746",
  productCrud:    "704c3bb8-e6e9-43d2-82a5-51234ec8c2a5",
  imageGallery:   "102ef678-33e7-4d54-a766-89c9c2381f72",
};

// Data Analytics tasks
const T_DA = {
  ingestion:    "cb6cb73d-7fac-4f08-8d62-19543d744d94",
  etl:          "8ef68a57-f7f3-42a0-bf1b-b0a0bb4dde6c",
  connectors:   "9cf5f1aa-43c0-43f2-81c0-95b8d9be6a09",
  dbConnector:  "5948cf80-2377-4471-a9a9-0cff5aeed57f",
  dashBuilder:  "e0a0c8ca-43bd-42a1-b470-0e8192a6b3d0",
  dragDrop:     "e7a0dcb7-c037-4197-b224-d050aa3c34f6",
  chartLib:     "ecca61a4-845e-471d-8b15-ab35513fe71a",
  timeSeries:   "9013f68d-463f-4806-bc99-2f6cd3bdd724",
  barPie:       "e63686d0-a72a-49b6-84f0-3f1570e99dbc",
  vizLayer:     "3840f0f0-ae2b-41a7-a03f-72bfd7748753",
  realtime:     "21511ad7-a379-4b49-a07e-52e15b297cc9",
  streaming:    "6f73b39a-b3e1-4fd8-907f-77c4ae94c887",
  accessCtrl:   "2c8eeee2-5f6c-4cc0-87df-793f4f430034",
  rbac:         "7107e668-b297-4769-92d2-8b5e04b53283",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function isWeekend(d: Date): boolean {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

function workdays(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    if (!isWeekend(cur)) days.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

function jstToUtc(dateStr: string, jstHour: number, jstMin: number): string {
  let utcHour = jstHour - 9;
  let dayOffset = 0;
  if (utcHour < 0) { utcHour += 24; dayOffset = -1; }
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + dayOffset);
  d.setUTCHours(utcHour, jstMin, 0, 0);
  return d.toISOString().replace("T", " ").replace(/\.\d+Z$/, "");
}

function pick<T>(arr: T[], seed: number): T {
  return arr[((seed % arr.length) + arr.length) % arr.length];
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL!,
    charset: "utf8mb4_0900_ai_ci",
  });

  // ── 1. Groups ───────────────────────────────────────────────────────────────

  const gFrontend = crypto.randomUUID();
  const gBackend  = crypto.randomUUID();

  await conn.execute(
    `INSERT INTO user_groups (id, workspace_id, name, is_default) VALUES (?, ?, ?, 0), (?, ?, ?, 0)`,
    [gFrontend, WS, "Frontend & Design", gBackend, WS, "Backend & Data"]
  );

  const groupMembers: [string, string, string][] = [
    [gFrontend, M.alice,    "Leader"],
    [gFrontend, M.emma,     "Member"],
    [gFrontend, M.bob,      "Member"],
    [gFrontend, M.kate,     "Member"],
    [gFrontend, M.grace,    "Member"],
    [gBackend,  M.liam,     "Leader"],
    [gBackend,  M.david,    "Member"],
    [gBackend,  M.james,    "Member"],
    [gBackend,  M.noah,     "Member"],
    [gBackend,  M.frank,    "Member"],
    [gBackend,  M.maya,     "Member"],
    [gBackend,  M.isabella, "Member"],
  ];

  for (const [gid, uid, role] of groupMembers) {
    await conn.execute(
      `INSERT IGNORE INTO user_group_members (id, group_id, user_id, role) VALUES (?, ?, ?, ?)`,
      [crypto.randomUUID(), gid, uid, role]
    );
  }
  console.log("Groups + members done.");

  // ── 2. Capacities ──────────────────────────────────────────────────────────

  const caps: [string, number, number][] = [
    [M.alex,  5, 5], // PM — lots of meetings
    [M.henry, 8, 4], // QA — 4-day week
    [M.carol, 8, 4], // QA — 4-day week
    [M.kate,  7, 5], // Designer
    [M.grace, 7, 5], // Designer
  ];

  for (const [uid, hpd, dpw] of caps) {
    await conn.execute(
      `INSERT INTO user_capacity (id, user_id, workspace_id, hours_per_day, days_per_week)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE hours_per_day=VALUES(hours_per_day), days_per_week=VALUES(days_per_week)`,
      [crypto.randomUUID(), uid, WS, hpd, dpw]
    );
  }
  console.log("Capacities done.");

  // ── 3. Planned assignments ──────────────────────────────────────────────────

  type PA = [string, string | null, string, string, string, number];
  const pa: PA[] = [
    // ── E-Commerce Platform ──────────────────────────────────────────────────
    [M.alex,     P.ec,   "Project Management & Coordination",  "2026-02-02", "2026-07-31",  80],
    [M.kate,     P.ec,   "UI/UX Design — Product & Cart",     "2026-02-02", "2026-03-31", 120],
    [M.grace,    P.ec,   "Design System & Components",         "2026-02-02", "2026-04-30", 100],
    [M.alice,    P.ec,   "Product Listing & Search UI",        "2026-03-02", "2026-05-15", 140],
    [M.emma,     P.ec,   "Cart & Checkout Frontend",           "2026-04-01", "2026-06-30", 130],
    [M.bob,      P.ec,   "Admin Dashboard Frontend",           "2026-05-01", "2026-07-15", 100],
    [M.liam,     P.ec,   "Product & Inventory API",            "2026-03-02", "2026-05-15", 140],
    [M.david,    P.ec,   "Payment & Order API",                "2026-04-01", "2026-06-30", 120],
    [M.noah,     P.ec,   "Order Management & Shipping",        "2026-05-01", "2026-07-15", 110],
    [M.henry,    P.ec,   "QA & E2E Test Suite",                "2026-06-01", "2026-07-31",  80],
    [M.carol,    P.ec,   "Regression & UAT Testing",           "2026-05-16", "2026-07-31",  70],

    // ── Data Analytics Dashboard ─────────────────────────────────────────────
    [M.maya,     P.da,   "ETL & Data Ingestion Pipeline",      "2026-02-02", "2026-04-30", 130],
    [M.isabella, P.da,   "Data Modeling & Analytics",          "2026-02-16", "2026-05-29", 110],
    [M.grace,    P.da,   "Dashboard UX Design",                "2026-02-02", "2026-03-13",  50], // stacks on EC design
    [M.james,    P.da,   "Backend API & Data Connectors",      "2026-04-01", "2026-06-30", 130],
    [M.frank,    P.da,   "Real-time Streaming & Kafka",        "2026-05-01", "2026-07-15", 100],
    [M.alice,    P.da,   "Chart & Visualization Components",   "2026-05-16", "2026-07-15",  80], // stacks on EC work
    [M.alex,     P.da,   "Product Roadmap & Stakeholders",     "2026-02-02", "2026-07-31",  60], // stacks on EC mgmt
  ];

  for (const [uid, pid, title, sd, ed, hrs] of pa) {
    await conn.execute(
      `INSERT INTO planned_assignments
         (id, workspace_id, user_id, project_id, title, start_date, end_date, estimated_hours, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), WS, uid, pid, title, sd, ed, hrs.toFixed(2), M.alex]
    );
  }
  console.log(`${pa.length} planned assignments done.`);

  // ── 4. Work logs (Feb–Apr 2026) ─────────────────────────────────────────────

  interface Profile {
    userId: string;
    tasks: string[];
    actionTypes: string[];
    morningNotes: string[];
    afternoonNotes: string[];
    overtimeRate: number;
  }

  const profiles: Profile[] = [
    {
      userId: M.alex,
      tasks: [T_EC.adminDash, T_DA.dashBuilder, T_EC.checkout, T_DA.accessCtrl],
      actionTypes: ["Planning", "Meeting", "Review"],
      morningNotes: ["Sprint planning", "Backlog grooming", "Stakeholder sync"],
      afternoonNotes: ["Team standup", "Risk review", "Roadmap update", "1-on-1s"],
      overtimeRate: 0.1,
    },
    {
      userId: M.alice,
      tasks: [T_EC.searchUI, T_EC.productDetail, T_EC.searchFilter, T_DA.chartLib],
      actionTypes: ["Coding", "Coding", "Review"],
      morningNotes: ["Frontend implementation", "Component development", "UI coding"],
      afternoonNotes: ["Code review", "Bug fixes", "PR review", "Testing"],
      overtimeRate: 0.25,
    },
    {
      userId: M.liam,
      tasks: [T_EC.productMgmt, T_EC.productCrud, T_EC.addressApi, T_EC.searchFilter],
      actionTypes: ["Coding", "Coding", "Review"],
      morningNotes: ["API implementation", "Database work", "Backend coding"],
      afternoonNotes: ["Code review", "Unit tests", "PR merge", "Debugging"],
      overtimeRate: 0.3,
    },
    {
      userId: M.kate,
      tasks: [T_EC.productDetail, T_EC.imageGallery, T_EC.checkout, T_EC.cart],
      actionTypes: ["Design", "Design", "Review"],
      morningNotes: ["UI design", "Figma prototyping", "Wireframing"],
      afternoonNotes: ["Design review", "Style guide update", "Component specs", "UX research"],
      overtimeRate: 0.15,
    },
    {
      userId: M.david,
      tasks: [T_EC.payment, T_EC.checkout, T_EC.addressApi, T_EC.orderEmail],
      actionTypes: ["Coding", "Coding", "Review"],
      morningNotes: ["Payment API work", "Backend implementation", "Integration"],
      afternoonNotes: ["API testing", "Code review", "Debugging", "Documentation"],
      overtimeRate: 0.3,
    },
    {
      userId: M.emma,
      tasks: [T_EC.cart, T_EC.cartPersist, T_EC.cartItems, T_EC.checkout],
      actionTypes: ["Coding", "Coding", "Review"],
      morningNotes: ["Cart UI implementation", "React components", "Frontend work"],
      afternoonNotes: ["Styling", "E2E tests", "Code review", "Bug fixes"],
      overtimeRate: 0.2,
    },
    {
      userId: M.henry,
      tasks: [T_EC.checkout, T_EC.payment, T_EC.searchFilter, T_DA.accessCtrl],
      actionTypes: ["Testing", "Testing", "Review"],
      morningNotes: ["Test case authoring", "Manual testing", "QA checklist"],
      afternoonNotes: ["Bug reporting", "Regression testing", "Test automation", "QA report"],
      overtimeRate: 0.15,
    },
    {
      userId: M.james,
      tasks: [T_DA.connectors, T_DA.dbConnector, T_DA.etl, T_EC.adminDash],
      actionTypes: ["Coding", "Coding", "Review"],
      morningNotes: ["Full-stack development", "API design", "Data connector work"],
      afternoonNotes: ["Integration testing", "Code review", "Schema design", "Debugging"],
      overtimeRate: 0.25,
    },
    {
      userId: M.grace,
      tasks: [T_EC.productDetail, T_DA.vizLayer, T_DA.dashBuilder, T_EC.imageGallery],
      actionTypes: ["Design", "Design", "Review"],
      morningNotes: ["Design system work", "Figma components", "Visual design"],
      afternoonNotes: ["Design QA", "Component library", "Style tokens", "Review session"],
      overtimeRate: 0.1,
    },
    {
      userId: M.noah,
      tasks: [T_EC.shipping, T_EC.orderEmail, T_EC.checkout, T_EC.addressApi],
      actionTypes: ["Coding", "Coding", "Review"],
      morningNotes: ["Order API implementation", "Backend work", "API coding"],
      afternoonNotes: ["Unit tests", "Code review", "Integration", "Documentation"],
      overtimeRate: 0.2,
    },
    {
      userId: M.maya,
      tasks: [T_DA.ingestion, T_DA.etl, T_DA.connectors, T_DA.dbConnector],
      actionTypes: ["Coding", "Coding", "Review"],
      morningNotes: ["ETL pipeline work", "Data engineering", "Pipeline implementation"],
      afternoonNotes: ["Data validation", "Pipeline testing", "Code review", "Monitoring setup"],
      overtimeRate: 0.3,
    },
    {
      userId: M.bob,
      tasks: [T_EC.adminDash, T_EC.productCrud, T_EC.searchUI, T_EC.imageGallery],
      actionTypes: ["Coding", "Coding", "Review"],
      morningNotes: ["Admin UI implementation", "Frontend coding", "Component work"],
      afternoonNotes: ["Styling", "Code review", "Bug fixes", "PR submission"],
      overtimeRate: 0.2,
    },
    {
      userId: M.frank,
      tasks: [T_DA.realtime, T_DA.streaming, T_DA.etl, T_DA.connectors],
      actionTypes: ["Coding", "Coding", "Review"],
      morningNotes: ["Streaming implementation", "Kafka setup", "Backend work"],
      afternoonNotes: ["Stream testing", "Performance tuning", "Code review", "Debugging"],
      overtimeRate: 0.25,
    },
    {
      userId: M.isabella,
      tasks: [T_DA.vizLayer, T_DA.chartLib, T_DA.timeSeries, T_DA.barPie],
      actionTypes: ["Coding", "Design", "Review"],
      morningNotes: ["Data analysis", "Visualization design", "Analytics work"],
      afternoonNotes: ["Chart implementation", "Data modeling", "Report creation", "Review"],
      overtimeRate: 0.15,
    },
    {
      userId: M.carol,
      tasks: [T_EC.cart, T_EC.checkout, T_DA.accessCtrl, T_DA.rbac],
      actionTypes: ["Testing", "Testing", "Review"],
      morningNotes: ["Test planning", "Manual QA", "Test case review"],
      afternoonNotes: ["Bug tracking", "Regression tests", "Test report", "UAT prep"],
      overtimeRate: 0.1,
    },
  ];

  type TimeSlot = [number, number];
  interface Variant { am: [TimeSlot, TimeSlot]; pm: [TimeSlot, TimeSlot]; ot?: [TimeSlot, TimeSlot] }

  const variants: Variant[] = [
    { am: [[10,  0], [12, 30]], pm: [[13, 30], [18, 30]] },
    { am: [[10,  0], [13,  0]], pm: [[14,  0], [19,  0]] },
    { am: [[10,  0], [12, 30]], pm: [[13, 30], [19,  0]] },
    { am: [[10, 15], [13,  0]], pm: [[14,  0], [18, 30]] },
    { am: [[10,  0], [12, 30]], pm: [[13, 30], [18,  0]] },
    { am: [[10,  0], [13,  0]], pm: [[14,  0], [18, 30]] },
    { am: [[10, 30], [13,  0]], pm: [[14,  0], [19,  0]] },
    { am: [[10,  0], [12, 30]], pm: [[13, 30], [19,  0]], ot: [[19, 30], [21,  0]] },
    { am: [[10,  0], [13,  0]], pm: [[14,  0], [19,  0]], ot: [[19, 30], [20, 30]] },
    { am: [[10,  0], [12, 30]], pm: [[13, 30], [19,  0]], ot: [[19, 30], [22,  0]] },
  ];

  const wdays = workdays(new Date("2026-02-02T00:00:00Z"), new Date("2026-04-30T00:00:00Z"));
  const logRows: string[] = [];

  for (let di = 0; di < wdays.length; di++) {
    const dateStr = wdays[di].toISOString().slice(0, 10);
    for (let pi = 0; pi < profiles.length; pi++) {
      const p = profiles[pi];
      const seed = di * 31 + pi * 7;
      const useOt = (seed % 10) < Math.round(p.overtimeRate * 10);
      const v = useOt ? pick(variants.slice(7), seed) : pick(variants.slice(0, 7), seed);

      const id1 = crypto.randomUUID(), id2 = crypto.randomUUID();
      const t1 = pick(p.tasks, seed), t2 = pick(p.tasks, seed + 3);
      const a1 = pick(p.actionTypes, seed), a2 = pick(p.actionTypes, seed + 2);
      const n1 = pick(p.morningNotes, seed), n2 = pick(p.afternoonNotes, seed + 1);

      logRows.push(
        `('${id1}','${p.userId}','${t1}','${jstToUtc(dateStr, v.am[0][0], v.am[0][1])}','${jstToUtc(dateStr, v.am[1][0], v.am[1][1])}','${n1}','${a1}')`,
        `('${id2}','${p.userId}','${t2}','${jstToUtc(dateStr, v.pm[0][0], v.pm[0][1])}','${jstToUtc(dateStr, v.pm[1][0], v.pm[1][1])}','${n2}','${a2}')`
      );

      if (v.ot) {
        const idOt = crypto.randomUUID();
        const t3 = pick(p.tasks, seed + 5), a3 = pick(p.actionTypes, seed + 4), n3 = pick(p.afternoonNotes, seed + 6);
        logRows.push(
          `('${idOt}','${p.userId}','${t3}','${jstToUtc(dateStr, v.ot[0][0], v.ot[0][1])}','${jstToUtc(dateStr, v.ot[1][0], v.ot[1][1])}','${n3}','${a3}')`
        );
      }
    }
  }

  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < logRows.length; i += BATCH) {
    await conn.execute(
      `INSERT INTO work_logs (id, user_id, task_id, start_time, end_time, note, action_type) VALUES ${logRows.slice(i, i + BATCH).join(",")}`
    );
    inserted += logRows.slice(i, i + BATCH).length;
    process.stdout.write(`\r  work logs ${inserted}/${logRows.length}`);
  }
  console.log(`\n${logRows.length} work log entries inserted.`);

  await conn.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
