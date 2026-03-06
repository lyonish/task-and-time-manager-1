# Seed Scripts

## Scripts

| Script | Description |
|--------|-------------|
| `seed-tasks.ts` | Populates the first project with 60 hierarchical test tasks (Condor→Sparrow) |
| `seed-sample-data.ts` | Adds 14 English-speaking members, 2 projects (50 tasks) to the existing workspace |
| `seed-work-logs-and-steps.ts` | Replaces work logs with 14 days of data; adds steps to 8 tasks in the seeded projects |
| `seed-japanese-org.ts` | Creates a fully independent Japanese tenant with 15 members, 2 projects, 50 tasks, 14-day logs, and steps |

Run any script with:
```bash
npx tsx scripts/<script-name>.ts
```

---

## Login Credentials

All seeded accounts use the password: **`password123`**

> All accounts including workspace owners use **`password123`**.

---

### Org 1 — Nishimura1's Workspace

| Role | Name | Email |
|------|------|-------|
| Owner | Alex Rivera | alex.rivera@example.com |
| Member | Alice Chen | alice.chen@example.com |
| Member | Bob Martinez | bob.martinez@example.com |
| Member | Carol Kim | carol.kim@example.com |
| Member | David Patel | david.patel@example.com |
| Member | Emma Johnson | emma.johnson@example.com |

<details>
<summary>All 14 seeded members</summary>

| Name | Email |
|------|-------|
| Alice Chen | alice.chen@example.com |
| Bob Martinez | bob.martinez@example.com |
| Carol Kim | carol.kim@example.com |
| David Patel | david.patel@example.com |
| Emma Johnson | emma.johnson@example.com |
| Frank Nguyen | frank.nguyen@example.com |
| Grace Liu | grace.liu@example.com |
| Henry Brown | henry.brown@example.com |
| Isabella Davis | isabella.davis@example.com |
| James Wilson | james.wilson@example.com |
| Kate Thompson | kate.thompson@example.com |
| Liam Anderson | liam.anderson@example.com |
| Maya Rodriguez | maya.rodriguez@example.com |
| Noah Taylor | noah.taylor@example.com |

</details>

---

### Org 2 — 株式会社テクノビジョン

| Role | Name | Email |
|------|------|-------|
| Admin (Owner) | 田中 太郎 | taro.tanaka@technovision.jp |
| Project Manager | 佐藤 花子 | hanako.sato@technovision.jp |
| Project Manager | 鈴木 一郎 | ichiro.suzuki@technovision.jp |
| Member | 山田 美咲 | misaki.yamada@technovision.jp |
| Member | 伊藤 健太 | kenta.ito@technovision.jp |
| Member | 渡辺 さくら | sakura.watanabe@technovision.jp |

<details>
<summary>All 15 members</summary>

| Name | Email |
|------|-------|
| 田中 太郎 | taro.tanaka@technovision.jp |
| 佐藤 花子 | hanako.sato@technovision.jp |
| 鈴木 一郎 | ichiro.suzuki@technovision.jp |
| 山田 美咲 | misaki.yamada@technovision.jp |
| 伊藤 健太 | kenta.ito@technovision.jp |
| 渡辺 さくら | sakura.watanabe@technovision.jp |
| 中村 大輔 | daisuke.nakamura@technovision.jp |
| 小林 愛 | ai.kobayashi@technovision.jp |
| 加藤 翔 | sho.kato@technovision.jp |
| 吉田 雅子 | masako.yoshida@technovision.jp |
| 山本 直樹 | naoki.yamamoto@technovision.jp |
| 松本 由美 | yumi.matsumoto@technovision.jp |
| 井上 拓也 | takuya.inoue@technovision.jp |
| 木村 明日香 | asuka.kimura@technovision.jp |
| 林 浩二 | koji.hayashi@technovision.jp |

</details>
