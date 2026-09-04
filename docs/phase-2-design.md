# Mission Quest — Phase 2: UI/UX & Design System

> Companion to `phase-1-architecture.md`. This file is the design source of truth for Phase 3 onward: tokens, components, screens, copy and celebration choreography. The visual mockups live on the "Mission Quest Screens" design canvas.

---

## 1. Design principles

1. **Two moods, one family.** Parent and child apps share a wordmark, a rounded geometry and the same semantic colours (streak flame, golden, points), but nothing else. The child app is a game world; the parent app is a calm control room.
2. **The 3-second rule is a layout rule.** Above the fold on the child home there are exactly four facts: what's left (mission count + first pending card), what's done (ring), points today, streak status. Nothing else competes.
3. **Big, few, obvious.** Child tap targets are ≥ 56 px tall, one primary action per card, ≤ 6 nav items, ≤ 12 words per card.
4. **Positive by construction.** No red for misses, no "failed", no countdowns. Misses are grey and soft; the retry state is warm, not alarming.
5. **Celebrate proportionally.** One approval = a 1.6 s moment. Five approvals = one batched 3 s moment. Level-ups and achievements interrupt; everything else is ambient.
6. **Motion has a budget and an off switch.** Every animation is gated by `prefers-reduced-motion` and the child's/parent's animation setting. Reduced motion keeps the information (a checkmark, a number change) and drops the spectacle.

---

## 2. Design system

### 2.1 Colour tokens

Two themes, each with light and dark variants. Semantic tokens are shared across themes so components can be reused.

#### Sunrise (child)

| Token | Light | Dark ("Night Sky") | Use |
|---|---|---|---|
| `--bg` | `#F3F7FF` → `#EAF0FF` (gradient) | `#0F1330` → `#161C45` | page ground |
| `--surface` | `#FFFFFF` | `#1E2650` | cards |
| `--surface-2` | `#EEF3FF` | `#26305E` | inset areas, tracks |
| `--ink` | `#1F2A44` | `#F2F5FF` | text |
| `--ink-2` | `#3F4B6B` | `#C9D2F2` | secondary text |
| `--muted` | `#6B7A99` | `#8E9AC4` | captions |
| `--line` | `#DCE4F5` | `#2F3A6E` | hairlines |
| `--sky` | `#3F7BEA` | `#6B9BFF` | primary action, ring fill |
| `--sky-soft` | `#DCE8FF` | `#243566` | primary tint |
| `--sun` | `#F5A623` | `#FFB84D` | points |
| `--sun-soft` | `#FFF1D6` | `#3A2E12` | points tint |
| `--gold` | `#E3A008` | `#F2B93B` | golden streak (distinct from sun by darker step + crown icon) |
| `--flame` | `#FF6B35` | `#FF8A5C` | normal streak |
| `--flame-soft` | `#FFE4D9` | `#3D2416` | streak tint |
| `--leaf` | `#2DB07A` | `#4CD394` | done / approved |
| `--leaf-soft` | `#DDF5EA` | `#123A2B` | done tint |
| `--berry` | `#8B5CF6` | `#A78BFA` | level, XP, achievements |
| `--berry-soft` | `#ECE4FF` | `#2E2459` | level tint |
| `--peach` | `#FFB4A2` | `#FF9F86` | "try again" (warm, never red) |
| `--shadow` | `0 6px 20px rgba(31,42,68,.08)` | `0 6px 20px rgba(0,0,0,.35)` | card lift |

Accents (`sky`, `sun`, `flame`, `leaf`, `berry`) sit at similar OKLCH lightness/chroma so no one hue shouts. Each semantic colour is paired with an icon and a word wherever it carries meaning (flame + "streak", crown + "golden", star + "points").

#### Slate (parent)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F4F6FA` | `#0F1420` | page ground |
| `--surface` | `#FFFFFF` | `#171D2B` | cards, tables |
| `--surface-2` | `#EEF1F7` | `#1E2536` | table header, inset |
| `--ink` | `#1A2233` | `#E8ECF4` | text |
| `--ink-2` | `#3B4559` | `#C3CAD8` | secondary |
| `--muted` | `#66718A` | `#98A2B8` | captions, labels |
| `--line` | `#E1E6EF` | `#2A3346` | borders |
| `--primary` | `#4C4DDC` | `#8A8BFF` | actions, links, focus |
| `--primary-soft` | `#E6E6FB` | `#25264A` | selected rows, chips |
| `--success` | `#1FA971` | `#3FC98F` | approved, on track |
| `--warning` | `#E0A21B` | `#F2B93B` | at risk, pending |
| `--danger` | `#E5484D` | `#FF6B70` | destructive actions only (archive, delete) |
| `--flame` / `--gold` / `--sun` | same as Sunrise | same | child stats inside parent cards |

#### Chart palette (validated with the dataviz checker)

| Slot | Light | Dark | Assigned to |
|---|---|---|---|
| 1 | `#3F7BEA` | `#3F7BEA` | first child (Alex) |
| 2 | `#F29A1F` | `#C4760F` | second child (Maya) |
| 3 | `#2DB07A` | `#27A06E` | third child (Leo) |

Slot order is fixed by child `sortOrder` and never re-assigned when a filter removes a child. Slots 2 and 3 sit below 3:1 against the light surface, so every chart that uses them carries direct labels or a table view. Single-series child charts use `--sky` only.

### 2.2 Typography

| Role | Child (Sunrise) | Parent (Slate) |
|---|---|---|
| Display / numbers | **Baloo 2** 700–800 (rounded, chunky, friendly; fallback `"Arial Rounded MT Bold", system-ui`) | **Bricolage Grotesque** 600–700 (fallback `system-ui`) |
| Body / UI | **Nunito** 500–800 (fallback `system-ui, "Segoe UI"`) | **Instrument Sans** 400–600 (fallback `system-ui`) |
| Data / code | — | `ui-monospace` for ledger ids only |

Child type scale (px / line-height): 44/1.05 hero number · 30/1.1 h1 · 24/1.15 h2 · 20/1.2 card title · 17/1.4 body · 15/1.4 secondary · 13/1.3 label (uppercase, +0.06em).
Parent type scale: 30/1.15 page title · 22/1.2 section · 17/1.3 card title · 15/1.5 body · 13/1.4 meta · 12/1.3 table label (uppercase, +0.08em).
Numbers in tables and axis ticks use `font-variant-numeric: tabular-nums`; hero numbers use proportional figures.

### 2.3 Geometry

| Token | Child | Parent |
|---|---|---|
| Radius | `--r-sm 12` · `--r-md 20` · `--r-lg 28` · `--r-pill 999` | `--r-sm 8` · `--r-md 12` · `--r-lg 16` |
| Card padding | 20 (mobile) / 24 (tablet+) | 16 / 20 |
| Page gutter | 20 (mobile) / 32 (tablet) / 40 (desktop) | 24 / 32 / 40 |
| Spacing scale | 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 56 | same |
| Border | 1.5 px `--line` on inset elements; cards use shadow, not border | 1 px `--line`; tables/cards bordered, no shadow |
| Min tap target | 56 × 56 (nav 64 tall) | 40 × 40 |
| Elevation | 0 flat · 1 card (`--shadow`) · 2 floating (celebration, sheet) | 0 · 1 popover · 2 dialog |

### 2.4 Motion tokens

| Token | Value | Use |
|---|---|---|
| `--ease-out` | `cubic-bezier(.2,.8,.2,1)` | entrances |
| `--ease-spring` | Motion spring `{ stiffness: 420, damping: 26 }` | taps, pops, badges |
| `--dur-fast` | 120 ms | hover, toggle |
| `--dur-base` | 220 ms | card state change |
| `--dur-slow` | 480 ms | progress ring fill, points count-up |
| `--dur-moment` | 1600 ms | single celebration total |
| `--dur-batch` | 3000 ms | batched celebration total |

Reduced motion (`prefers-reduced-motion: reduce` **or** user setting off): durations collapse to ≤ 120 ms, no confetti/particles, no translate > 8 px, count-ups render final value immediately, the celebration modal fades in with a static badge.

### 2.5 Iconography

- **Task icons are emoji**, chosen by the parent from a curated picker (about 80, grouped Morning / School / Home / Play / Care). This is a deliberate product decision from the brief: zero asset cost, instantly legible to non-readers, renders everywhere.
- **UI icons are Lucide** (stroke 2 px, 24 px in child, 20 px in parent). Never emoji for navigation, status or buttons.
- **Semantic marks** are custom SVG: flame (streak), crown (golden), star (points), sparkle (XP), shield (day off).

### 2.6 Tailwind mapping (Phase 3)

Tokens are CSS variables on `[data-theme="sunrise"]` / `[data-theme="slate"]` roots (set by the `(child)` and `(parent)` layouts), with `.dark` variants. Tailwind v4 `@theme` maps `--color-sky`, `--color-sun`, … to utilities, so components use `bg-sky text-ink rounded-md` and the same component renders correctly under either theme when it uses semantic tokens only.

---

## 3. Component specs

Format: purpose · anatomy · states · motion · accessibility.

### 3.1 TaskCard (child)
- **Purpose**: one mission; the most-tapped element in the product.
- **Anatomy**: 56 px icon tile (emoji on `--surface-2` circle) · title (20/700) · meta row (points pill `★ +10`, optional time `by 7:00 PM`, optional "from yesterday" chip) · primary action.
- **States**: `pending` (white card, action "Done!" full-width 56 px `--sky`) · `submitted` (card tinted `--sky-soft`, action replaced by "Waiting for Mom/Dad" with clock icon, secondary "Oops, not yet" link) · `approved` (tinted `--leaf-soft`, check badge, points pill solid `--sun`, card collapses to 72 px) · `retry` (tinted `--peach` at 30 %, note bubble "Almost! Dad says: …", action "Try again") · `missed` (greyed, dashed outline, no action, in Yesterday section only) · `overdue` (pending + "from Tuesday" chip) · `optional` (star outline badge "Bonus").
- **Motion**: tap → scale .97 spring; on submit → card flips to submitted tint (220 ms); on approval playback → check pops (spring), points pill flies to the header counter (480 ms), card collapses.
- **A11y**: whole card is not a button; only the action is. Action label includes task name (`aria-label="Mark Make your bed as done"`). Status announced via `aria-live="polite"` region.

### 3.2 TodayHero (child home)
- **Anatomy**: ProgressRing 132 px (`--sky` fill on `--surface-2` track, 12 px stroke, round caps) with `4/5` inside (44 px Baloo) and "missions" caption · right column: PointsDisplay (`★ 45 today`), StreakChip (`🔥 7`), GoldenChip (`👑 4`). Under the ring: one-line status ("1 more for a golden day!").
- **States**: 0 % ("Let's start your first mission!"), partial, 100 % pending approval ("All sent! Waiting for approval ✨"), golden ("Golden day! 👑"), rest day (no missions: "No missions today — enjoy your day!").
- **Motion**: ring fills from previous value over 480 ms on mount; number count-up.

### 3.3 StreakCard / GoldenStreakCard
- **StreakCard**: flame illustration (three sizes by streak length: 1–2 ember, 3–6 flame, 7+ blaze), `7 DAY STREAK` label, sentence "You've done missions 7 days in a row!", footer "Do 1 mission today to make it 8". At risk after 18:00 with nothing done: footer swaps to "Keep it alive — 1 mission is all it takes" (warm, no red).
- **GoldenStreakCard**: crown illustration, `GOLDEN STREAK 4`, "4 perfect days in a row!", footer explains the rule in kid words: "Golden = every mission done." Tooltip/"?" sheet: "A normal streak is doing at least one mission a day. A golden streak is doing all of them."
- **Broken state** (first view after a break): "Your 8-day streak ended. New adventure starts today 🚀" with a "Start again" button that scrolls to missions. Shown once, then the card returns to normal at 0.

### 3.4 PointsDisplay
Star icon + number (Baloo 700) + label. Variants: `today`, `balance` (Rewards screen), `lifetime` (Profile). Count-up animation on change; a floating `+10` chip spawns from the approved card and lands here.

### 3.5 Avatar / AvatarEditor
- Layered SVG: background circle → base character (6 animals: fox, bear, cat, panda, owl, bunny) → skin/colour → hair/ears accessory → outfit → accessory (glasses, hat, scarf, cape) → frame (level ring). Sizes 40 / 64 / 96 / 160.
- Editor: tabs per slot, 72 px item tiles, locked tiles show a padlock and "Level 5" / "7-day streak" as the unlock hint. Preview at 160 px updates live; "Save" pill.

### 3.6 AchievementBadge
72 px hexagonal badge (`--berry` ring). States: `unlocked` (full colour, date), `locked` (greyscale 40 % with progress arc "12/20"), `secret` (question mark, "Keep going to find out!"), `new` (sparkle burst on first view, `seenAt` set after).

### 3.7 LevelProgress
"Level 7 · Climber" title, XP bar (`--berry` on `--berry-soft`, 12 px, rounded), "180 XP to Level 8", next unlock preview (item thumbnail + name). Level-up triggers the LevelUp celebration.

### 3.8 WorldMap
Vertically scrollable canvas (about 3× viewport height, bottom = start) with five painted regions stacked upward (Home Village → Whispering Forest → Crystal Mountain → Sunny Castle → Star Galaxy). Nodes per level on a winding path; passed nodes filled `--leaf` with a check, current node pulses with the avatar on it and a "You are here" tag, future nodes outlined with the level number, locked worlds veiled white at 55 % with a padlock pill "Reach Level 10 to enter". A sticky header carries the level name and XP bar; a bottom card previews the next unlock. Tap a node → sheet with level name and unlocks. Auto-scrolls to the current node on mount.

### 3.9 WeeklyMountainChart (child)
Seven columns (Mon–Sun) as rounded "peaks" (single hue `--sky`, ≤ 28 px wide, 4 px rounded top), a star on the best day, golden days get a small crown above the column, today's column outlined. Direct labels only on the best day and today; y-axis hidden, a caption carries the total ("You earned 325 points this week!"). Tooltip on tap shows day, points, missions. A "See as list" toggle renders the same data as rows.

### 3.10 MonthlyChart (child)
Calendar grid: each day is a 40 px circle — `--leaf` filled (active), `--gold` filled with crown dot (golden), outline (rest day), grey (missed all). Stats tiles below: points, perfect days, longest streak, missions done.

### 3.11 RewardCard
Icon tile · title · cost pill `★ 200`. States: `affordable` (cost pill `--sun`, action "Ask for it!"), `saving` (progress bar "150 / 200", action disabled "50 more to go"), `requested` ("Asked! Waiting for Mom/Dad"), `fulfilled` (check, date), `declined` ("Not this time — points are back ✨").

### 3.12 NotificationCard (child and parent variants)
Child: icon + one sentence + time, tinted by type, tap deep-links. Parent: dense row with actor avatar, sentence, inline actions where applicable ("Approve", "Ask to retry").

### 3.13 BottomNav (child)
64 px tall, 6 items, Lucide icons 26 px + 12 px label, active item gets `--sky-soft` pill. Badge dot on Home when celebrations are queued and on Rewards when a request was decided.

### 3.14 ParentChildCard
Avatar 48 · name · four stats in a 2×2 grid (streak, golden, points this week, completion %) each with icon + tabular number · footer "3 waiting for approval" link if any. Click → child detail.

### 3.15 ApprovalCard
Grouped by child. Row: emoji tile, task title, "+10", submitted time, optional child note; actions "Approve" (primary) and "Ask to retry" (secondary, opens note field with 3 suggested notes). Header "Approve all for Alex (3)". Bulk approve confirms with a toast "3 missions approved · +35 points to Alex".

### 3.16 TaskForm + ScheduleBuilder (parent)
Sections: Basics (title, emoji picker, category, description) · Points & difficulty (segmented Easy 5 / Normal 10 / Hard 20 / Epic 50, editable number) · Who (child chips, multi) · When (segmented Once / Every day / Weekly; day-of-week toggles; start/end dates; due time; time of day) · Rules (approval mode with explainer, rollover policy radio cards with one-line consequences, "Bonus mission" toggle) · Reminders (toggle + time). Right rail: live preview of the child's TaskCard. Sticky footer: Cancel / Save. Validation inline, on blur.

### 3.17 CelebrationModal + Confetti + PointsFly
See §6 for choreography. Modal is a full-screen layer (`position: fixed`, `--bg` at 92 % with blur), content centred, dismiss on tap anywhere or auto after the moment. `role="dialog"`, `aria-live="assertive"` sentence ("Mission complete. Make your bed. Plus 10 points.").

### 3.18 EmptyState / ErrorState / Skeleton
Child empty states are illustrated and cheerful ("No missions yet — ask Mom or Dad to add some!"). Parent empty states are instructive with a primary action ("Create your first task"). Errors say what happened and what to do ("Couldn't save. Check your connection and try again."). Skeletons mirror the component's silhouette; no spinners on full pages.

---

## 4. Child experience, screen by screen

### 4.1 Login (`/kid`)
Step 1 family code: three big word boxes + 2 digits, remembered on device. Step 2 avatar picker: up to three 120 px avatars with first names; tap one. Step 3 PIN: 4 large keys per row numeric pad, 56 px keys; dots fill; wrong PIN shakes gently ("Hmm, try again"). "Use username instead" link at the bottom. Rate-limit message after 5 tries: "Let's take a short break. Ask a parent if you forgot your PIN."

### 4.2 Welcome (`/kid/welcome`) — first run
Three cards swiped: "Meet your character" (mini editor for base + colour) → "This is your streak" (flame + crown explained in one sentence each) → "Your first missions are ready" (button "Let's go!"). Skippable.

### 4.3 Home (`/kid`)
Order: greeting row (avatar 64, "Hi, Alex! 👋", level pill) → TodayHero → mission groups (Morning, Afternoon, Evening, Anytime; pending first inside each; approved collapse to the bottom of the group) → Yesterday recap card (only if something was missed or it was golden) → Family goal card (cooperative mode) → bottom nav. Queued celebrations play on mount before anything else is interactive (skippable by tap).
States: loading skeleton (hero + 3 cards); rest day; all done; error banner with retry.

### 4.4 Missions (`/kid/missions`)
Tabs: Today · Overdue (only if any) · Yesterday · Bonus. Same TaskCards. Yesterday shows missed as soft grey with "Tomorrow is a new chance!" footer.

### 4.5 Map (`/kid/map`)
WorldMap full-bleed; header shows "Level 7 · Climber" and XP bar; bottom sheet on node tap.

### 4.6 Badges (`/kid/achievements`)
Header "18 of 42 badges" with progress bar; grid of AchievementBadge grouped by category (Streaks, Golden, Points, Missions, Special); "Almost there" row at the top for the three closest locked badges.

### 4.7 Progress (`/kid/progress`)
Segmented Week · Month. Week: WeeklyMountainChart + "Your best day was Saturday!" + three tiles (points, missions, golden days) + "Most done mission: Brush teeth ×7". Month: MonthlyChart + tiles.

### 4.8 Rewards (`/kid/rewards`)
Balance hero ("★ 340 to spend") → reward grid (affordable first) → "My requests" list.

### 4.9 Profile (`/kid/profile`)
Avatar 160 with "Edit" pill → name, level, title → four stat tiles (streak, golden, lifetime points, badges) → "This week" strip (7 mini columns) → toggles: Sounds, Animations → "Log out" (small, bottom).

---

## 5. Parent experience, screen by screen

### 5.1 Dashboard (`/parent`)
Top bar: family name, date, "Needs approval (4)" button (primary when > 0). Grid of ParentChildCard (1–3 columns). Below: "Today" strip (family completion %, missions done/total, points awarded) and Family goal progress. Right rail on desktop: recent activity feed. Empty family: onboarding CTA.

### 5.2 Approvals (`/parent/approvals`)
Tabs: Missions · Rewards. Grouped ApprovalCards; sticky "Approve all (4)" in the header. Empty: "All caught up ✓". Rejected-to-retry opens a side sheet with a note field and three suggestions.

### 5.3 Tasks (`/parent/tasks`)
Toolbar: search, filter chips (child, category, status, schedule), "New task", "Quick-add for today". Table columns: Task (emoji + title + category), Children (avatar stack), Points, Schedule (human string "Mon–Thu · 7:00 PM"), Rules (approval mode + rollover icons), Status; row menu: Edit · Duplicate · Pause · Archive. Rows for paused tasks are muted.

### 5.4 Task form (`/parent/tasks/new`, `/[id]`)
Two-column: form left, live child preview right (collapses below on tablet). See §3.16.

### 5.5 Child detail (`/parent/children/[id]`)
Header: avatar, name, level, streak/golden/points chips, actions (Send reminder · Day off · Reset PIN · Edit). Tabs: Today (instances with status and inline approve) · Week (chart + table) · Missed · Ledger (transactions table with reversal action) · Badges · Settings.

### 5.6 Analytics (`/parent/analytics`)
Filter row (child multi-select, range: This week / Last 4 weeks / This month). Charts: Points per day (grouped columns, one slot per child, legend + end labels), Completion % (one line per child), Category breakdown (horizontal bars per child), Most-missed tasks table. Every chart has a table toggle.

### 5.7 Rewards, Notifications, Settings
Rewards: cards + redemption table. Notifications: inbox list + "Send a reminder" composer (child chips, template chips, custom text, "Send now / Schedule"). Settings: tabbed pages per Phase 1 §3.

---

## 6. Celebration choreography

| Moment | Trigger | Timeline | Sound |
|---|---|---|---|
| **Sent** | child taps Done (PARENT mode) | 0 ms card tint → 120 ms small sparkle at the button → toast "Sent to Mom/Dad ✨" 1.2 s | `pop` |
| **Mission complete** | AUTO approval or playback of one approval | 0 ms dim layer · 150 ms badge scale-in (spring) with "MISSION COMPLETE!" · 300 ms task title + emoji · 500 ms `+10 POINTS` count-up · 650 ms confetti burst (120 particles, 1.2 s) · 1.6 s auto-dismiss → points chip flies to header | `chime` |
| **Batched** | ≥ 2 queued approvals | one modal: "While you were away…" list of up to 5 rows staggered 120 ms · total points count-up · one confetti burst · 3 s | `chime` once |
| **First mission bonus** | first approval of the day | appended line inside the same modal "+5 first mission bonus!" | — |
| **Golden day** | day closes golden (playback) | gold layer, crown drops in (spring), "GOLDEN DAY!" + streak count, gold confetti | `fanfare` |
| **Streak milestone** | 7/14/30/60/100 | flame grows, "7 DAY STREAK!" ring pulse, bonus line | `fanfare` |
| **Level up** | level increases | full-screen: world colour wash, avatar hops, "LEVEL UP! Level 8 · Summit Hero", unlocked item card slides up, "Wear it" / "Later" | `levelup` |
| **Achievement** | unlock | badge pops centre with rays, name + description, "Nice!" | `badge` |
| **Reward approved** | redemption approved | small modal with gift icon, "Movie night is yours!" | `pop` |

Rules: max one modal chain per app open; order = level up → achievements → golden/streak → missions batch; each step skippable; nothing plays while a parent is logged in on the same device; sounds off by default until the child toggles them (unlocks Web Audio on that tap); all sounds < 1.2 s, ≤ -12 dB.

---

## 7. Copy bank

Greetings (rotate by time): "Good morning, Alex! ☀️" · "Hi, Alex! 👋" · "Evening, Alex! 🌙"
Status lines: "1 more for a golden day!" · "All done — you're amazing!" · "Let's start with one mission." · "Waiting for approval ✨"
Streak: "Do 1 mission today to make it 8." · "Keep it alive — 1 mission is all it takes." · "Your 8-day streak ended. New adventure starts today 🚀"
Golden: "Golden = every mission done." · "Golden day! 👑" · "So close — 1 mission left for gold."
Retry (parent suggestions): "Almost there — give it one more try!" · "Looks great, just tidy the corners." · "Nearly done — can you finish the last bit?"
Missed: "You missed 2 missions yesterday. Tomorrow is a new chance!" · "No worries — today's a fresh start."
Reminders (parent templates): "Don't forget to read tonight 📚" · "Your room mission is waiting for you!" · "You've got 2 missions left today!" · "You're one mission away from keeping your golden streak!"
Rewards: "Ask for it!" · "50 more to go" · "Asked! Waiting for Mom/Dad" · "Not this time — your points are safe ✨"
Empty: "No missions today — enjoy your day!" · "No badges yet. Your first one is close!" · "Nothing to approve. Enjoy the quiet ☕" (parent)
Errors: "Couldn't save that. Check your connection and try again." · "Hmm, that PIN didn't match. Try again."
Never: fail, lose, behind, lazy, wrong, penalty, expired (child-facing), reject/rejected (child-facing).

---

## 8. Accessibility & responsiveness

- Breakpoints: 0–599 phone (single column, bottom nav), 600–1023 tablet (2-column cards, bottom nav; parent app shows a top bar with a scrollable nav row), 1024+ desktop (child: centred 720 px column, bottom nav kept for consistency; parent: 240 px sticky sidebar + content). The parent sidebar deliberately waits for the `lg` breakpoint so approval rows never overflow on tablets.
- Contrast: text ≥ 4.5:1 on every surface in both themes; accent-on-tint combinations checked (e.g. `--ink` on `--sun-soft`).
- Focus: 3 px `--sky` (child) / `--primary` (parent) ring, offset 2 px; visible on all interactive elements.
- Keyboard: nav via Tab; celebration dismiss on Esc/Enter; approvals list supports J/K + A/R shortcuts (parent).
- Screen readers: celebrations announced once via `aria-live`; progress ring has `role="progressbar"` with value text.
- Touch: 56 px child targets, 44 px minimum anywhere; swipe not required for any action.
- Text: child UI copy ≤ 12 words per element; reading level ~ age 7; parent copy plain and short.

---

## 9. Handoff to Phase 3

Build order: tokens + fonts → shared primitives (Button, Card, Pill, Sheet, Modal) → child components (TaskCard, TodayHero, Streak cards, PointsDisplay, BottomNav) → child Home wired to real data → parent shell + Dashboard + Approvals → Task form → the rest. Celebrations come after the data loop works end to end.
