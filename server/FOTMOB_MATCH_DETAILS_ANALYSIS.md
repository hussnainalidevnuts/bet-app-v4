# FotMob matchDetails API response analysis

**Endpoint:** `GET https://www.fotmob.com/api/data/matchDetails?matchId=4815412`

## Findings (matchId=4815412, Excelsior vs Ajax)

### 1. Events location
- **`header.events.events`** – **empty** for this response. `header.events` only has: `homeTeamGoals`, `awayTeamGoals`, `homeTeamRedCards`, `awayTeamRedCards`.
- **`content.matchFacts.events.events`** – **16 events** (Goal, Half, Substitution, Card, AddedTime). This is the actual timeline.

**Conclusion:** Timeline events come from **`content.matchFacts.events.events`**, not `header.events.events`. Settlement code must check both (or prefer matchFacts when header is empty).

### 2. Event time fields
- Events use **`time`** (number) and **`timeStr`** (number or string), e.g. `"time": 21, "timeStr": 21`.
- **No `minute`** field on these events.
- **No `second`** on most; **`overloadTime`** can be used for added time (e.g. substitution at 62+0).

**Conclusion:** For match clock we must use **`event.time`** or **`event.timeStr`** when `event.minute` is missing. Use **`event.second`** or **`event.overloadTime`** for seconds when present.

### 3. Corner events
- **No events with `type === "Corner"`** in this response. `eventTypes` are: Goal, Assist, Half, Substitution, Card, AddedTime, Yellow, Injuries.
- Corner **totals** appear only in **stats** (e.g. `stats.Periods.All` → Corners: [4, 1]; FirstHalf → Corners: [2, 0]).

**Conclusion:** For **Total Corners - 20:00–29:59** (and other time-window corner markets), we need per-minute corner data. FotMob’s matchDetails for this match does **not** expose corner events in the timeline, so time-window corner markets will show 0 corners from FotMob unless:
- FotMob adds Corner to the events array, or
- Another data source (e.g. Kambi/Opta) is used for settlement.

## Code changes made
- **`getCornersInTimeWindow`** and the “First corner in time window” logic now:
  1. Use both **`header.events.events`** and **`content.matchFacts.events.events`**.
  2. Use **`getEventMatchMinute(event)`** (minute → time → timeStr → shotmapEvent.min) and **`getEventMatchSecond(event)`** (second → overloadTime → 0) so FotMob’s `time`/`timeStr` are respected when `minute` is missing.
