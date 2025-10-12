// FotMob helper utilities for extracting standardized data from match details

// Normalize Unibet numeric line (e.g., 7500 -> 7.5)
export function normalizeLine(rawLine) {
    if (rawLine === null || rawLine === undefined) return null;
    const n = Number(rawLine);
    if (Number.isNaN(n)) return null;
    return n / 1000;
}

export function getFinalScore(matchDetails) {
    const homeScore = Number(matchDetails?.header?.teams?.[0]?.score ?? 0);
    const awayScore = Number(matchDetails?.header?.teams?.[1]?.score ?? 0);
    return { homeScore, awayScore };
}

export function getTeamNames(matchDetails) {
    const homeName = matchDetails?.general?.homeTeam?.name || matchDetails?.header?.teams?.[0]?.name || 'Home';
    const awayName = matchDetails?.general?.awayTeam?.name || matchDetails?.header?.teams?.[1]?.name || 'Away';
    return { homeName, awayName };
}

function flattenEventMap(eventMap) {
    // FotMob events like goals/cards are grouped by player name -> [events]
    if (!eventMap || typeof eventMap !== 'object') return [];
    const arrays = Object.values(eventMap).filter(Array.isArray);
    return arrays.flat();
}

function getGoalEvents(matchDetails) {
    const home = flattenEventMap(matchDetails?.header?.events?.homeTeamGoals);
    const away = flattenEventMap(matchDetails?.header?.events?.awayTeamGoals);
    const homeGoals = home.map(e => ({ ...e, isHome: true }));
    const awayGoals = away.map(e => ({ ...e, isHome: false }));
    return [...homeGoals, ...awayGoals];
}

export function getCardEvents(matchDetails) {
    // Cards are provided as generic Card events under header.events.events
    const eventsArray = matchDetails?.header?.events?.events;
    if (Array.isArray(eventsArray)) {
        return eventsArray
            .filter(ev => String(ev?.type).toLowerCase() === 'card' && !!ev?.card)
            .map(ev => ({ ...ev, isHome: !!ev?.isHome }));
    }

    // Fallback to legacy per-team maps if present
    const homeRed = flattenEventMap(matchDetails?.header?.events?.homeTeamRedCards);
    const awayRed = flattenEventMap(matchDetails?.header?.events?.awayTeamRedCards);
    const homeYellow = flattenEventMap(matchDetails?.header?.events?.homeTeamYellowCards);
    const awayYellow = flattenEventMap(matchDetails?.header?.events?.awayTeamYellowCards);

    const homeCards = [...homeRed, ...homeYellow].map(e => ({ ...e, isHome: true }));
    const awayCards = [...awayRed, ...awayYellow].map(e => ({ ...e, isHome: false }));
    return [...homeCards, ...awayCards];
}

// Best-effort absolute minute from event
export function getAbsoluteMinuteFromEvent(event) {
    // Prefer explicit numeric minute if available
    if (typeof event?.time === 'number') {
        // Some feeds already provide absolute minutes across halves
        if (event.time > 45) return event.time;
        const period = String(event?.shotmapEvent?.period || event?.period || '').toLowerCase();
        if (period.includes('second')) return event.time + 45;
        return event.time;
    }
    // Fallback to timeStr if numeric
    const t = Number(event?.timeStr);
    if (!Number.isNaN(t)) return t;
    return null;
}

export function isWithinWindow(absMinute, startInclusive, endInclusive) {
    if (absMinute === null || absMinute === undefined) return false;
    return absMinute >= startInclusive && absMinute <= endInclusive;
}

export function getHalftimeScore(matchDetails) {
    const goals = getGoalEvents(matchDetails);
    let home = 0, away = 0;
    for (const g of goals) {
        const m = getAbsoluteMinuteFromEvent(g);
        const inFirstHalf = m !== null ? m <= 45 : (String(g?.period || '').toLowerCase().includes('first'));
        if (inFirstHalf) {
            if (g.isHome) home++; else away++;
        }
    }
    return { home, away };
}

export function getSecondHalfScore(matchDetails) {
    const goals = getGoalEvents(matchDetails);
    let home = 0, away = 0;
    for (const g of goals) {
        const m = getAbsoluteMinuteFromEvent(g);
        const inSecondHalf = m !== null ? m > 45 : (String(g?.period || '').toLowerCase().includes('second'));
        if (inSecondHalf) {
            if (g.isHome) home++; else away++;
        }
    }
    return { home, away };
}

export function getTeamGoalsByInterval(matchDetails, startMinuteInclusive, endMinuteInclusive) {
    const goals = getGoalEvents(matchDetails);
    let home = 0, away = 0;
    for (const g of goals) {
        const m = getAbsoluteMinuteFromEvent(g);
        if (isWithinWindow(m, startMinuteInclusive, endMinuteInclusive)) {
            if (g.isHome) home++; else away++;
        }
    }
    return { home, away };
}

// New helpers for Phase 3 (time windows and sequencing)
export function getGoalsInWindow(matchDetails, startMinuteInclusive, endMinuteInclusive) {
    const goals = getGoalEvents(matchDetails);
    const hits = [];
    for (const g of goals) {
        const m = getAbsoluteMinuteFromEvent(g);
        if (isWithinWindow(m, startMinuteInclusive, endMinuteInclusive)) {
            hits.push({ minute: m, isHome: g.isHome, raw: g });
        }
    }
    // Ensure deterministic order by minute then home before away to make ties predictable
    hits.sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0) || (a.isHome === b.isHome ? 0 : a.isHome ? -1 : 1));
    return hits;
}

export function getFirstGoalAfterMinute(matchDetails, minuteExclusive) {
    const goals = getGoalEvents(matchDetails)
        .map(g => ({ minute: getAbsoluteMinuteFromEvent(g), isHome: g.isHome, raw: g }))
        .filter(g => g.minute !== null && g.minute > minuteExclusive)
        .sort((a, b) => a.minute - b.minute);
    return goals.length > 0 ? goals[0] : null;
}

export function getNthGoal(matchDetails, n) {
    if (!Number.isFinite(n) || n <= 0) return null;
    const goals = getGoalEvents(matchDetails)
        .map(g => ({ minute: getAbsoluteMinuteFromEvent(g), isHome: g.isHome, raw: g }))
        .filter(g => g.minute !== null)
        .sort((a, b) => a.minute - b.minute);
    return goals[n - 1] || null;
}

function findTeamStatPair(matchDetails, wantedKey) {
    const groups = matchDetails?.content?.stats?.Periods?.All?.stats;
    if (!Array.isArray(groups)) return null;
    
    for (const group of groups) {
        if (!group?.stats || !Array.isArray(group.stats)) continue;
        
        for (const s of group.stats) {
            if (!s) continue;
            
            // Direct match
            if (s.key === wantedKey && Array.isArray(s.stats) && s.stats.length === 2) {
                return { home: Number(s.stats[0] ?? 0), away: Number(s.stats[1] ?? 0) };
            }
            
            // Nested stats array (this is the main case for FotMob structure)
            if (Array.isArray(s.stats)) {
                for (const nested of s.stats) {
                    if (nested && nested.key === wantedKey && Array.isArray(nested.stats) && nested.stats.length === 2) {
                        return { home: Number(nested.stats[0] ?? 0), away: Number(nested.stats[1] ?? 0) };
                    }
                }
            }
        }
    }
    return null;
}

export function getCornersFromStats(matchDetails) {
    const pair = findTeamStatPair(matchDetails, 'corners');
    if (!pair) return null;
    return { ...pair, total: pair.home + pair.away };
}

export function getFoulsFromStats(matchDetails) {
    const pair = findTeamStatPair(matchDetails, 'fouls');
    if (!pair) return null;
    return { ...pair, total: pair.home + pair.away };
}

export function getTeamCards(matchDetails) {
    // Primary: event timeline
    const events = getCardEvents(matchDetails);
    const counts = {
        home: { yellow: 0, red: 0, total: 0 },
        away: { yellow: 0, red: 0, total: 0 }
    };
    for (const c of events) {
        const bucket = c.isHome ? counts.home : counts.away;
        const t = String(c?.card || '').toLowerCase();
        if (t.includes('yellow')) bucket.yellow++;
        if (t.includes('red')) bucket.red++;
        bucket.total++;
    }

    // Supplement with aggregate stats when available (handles feeds missing yellow card timeline)
    const yellowPair = findTeamStatPair(matchDetails, 'yellow_cards');
    const redPair = findTeamStatPair(matchDetails, 'red_cards');
    if (yellowPair || redPair) {
        const statsHomeYellow = Number(yellowPair?.home ?? 0);
        const statsAwayYellow = Number(yellowPair?.away ?? 0);
        const statsHomeRed = Number(redPair?.home ?? 0);
        const statsAwayRed = Number(redPair?.away ?? 0);

        // If stats indicate higher counts than timeline, trust stats
        counts.home.yellow = Math.max(counts.home.yellow, statsHomeYellow);
        counts.away.yellow = Math.max(counts.away.yellow, statsAwayYellow);
        counts.home.red = Math.max(counts.home.red, statsHomeRed);
        counts.away.red = Math.max(counts.away.red, statsAwayRed);
        counts.home.total = counts.home.yellow + counts.home.red;
        counts.away.total = counts.away.yellow + counts.away.red;
    }
    return counts;
}

// Stubs (to be expanded in later phases)
export function getPlayerStats(matchDetails, playerId) {
    if (!matchDetails || !playerId) return null;
    const key = String(playerId);
    const playerStatsMap = matchDetails.playerStats || matchDetails.content?.playerStats || null;
    const player = playerStatsMap ? playerStatsMap[key] : null;

    const result = { shotsOnTarget: null, goals: null };

    // Read aggregated per-player stats if available
    if (player && Array.isArray(player.stats)) {
        for (const section of player.stats) {
            const dictOrArray = section?.stats;
            if (!dictOrArray) continue;
            if (Array.isArray(dictOrArray)) {
                for (const obj of dictOrArray) {
                    if (!obj) continue;
                    const k = String(obj?.key || '').toLowerCase();
                    const val = obj?.stat?.value;
                    if (k === 'shotsontarget' && typeof val === 'number') result.shotsOnTarget = Number(val);
                    if (k === 'goals' && typeof val === 'number') result.goals = Number(val);
                }
            } else if (typeof dictOrArray === 'object') {
                for (const [label, obj] of Object.entries(dictOrArray)) {
                    const k = String(obj?.key || '').toLowerCase();
                    const labelKey = String(label || '').toLowerCase();
                    const val = obj?.stat?.value;
                    if (k === 'shotsontarget' || labelKey.includes('shots on target')) {
                        if (typeof val === 'number') result.shotsOnTarget = Number(val);
                    }
                    if (k === 'goals' || labelKey === 'goals') {
                        if (typeof val === 'number') result.goals = Number(val);
                    }
                }
            }
        }
    }

    // Fallback 1: player's own shotmap (if present in this fixture)
    if ((result.shotsOnTarget === null || result.shotsOnTarget === undefined) && Array.isArray(player?.shotmap)) {
        const sot = player.shotmap.reduce((acc, ev) => acc + (ev?.isOnTarget ? 1 : 0), 0);
        if (Number.isFinite(sot)) result.shotsOnTarget = sot;
    }

    // Fallback 2: compute shots on target from global shotmap when stat is missing
    if (result.shotsOnTarget === null || result.shotsOnTarget === undefined) {
        const globalShotmap = Array.isArray(matchDetails?.shotmap)
            ? matchDetails.shotmap
            : (Array.isArray(matchDetails?.header?.events?.shotmap)
                ? matchDetails.header.events.shotmap
                : null);
        if (Array.isArray(globalShotmap)) {
            const sot = globalShotmap
                .filter(ev => ev?.playerId === Number(playerId))
                .reduce((acc, ev) => acc + (ev?.isOnTarget ? 1 : 0), 0);
            if (Number.isFinite(sot)) result.shotsOnTarget = sot;
        }
    }

    // Fallback 3: as a last resort, approximate SOT with goals count
    if (result.shotsOnTarget === null || result.shotsOnTarget === undefined) {
        const { goals } = getPlayerEvents(matchDetails, Number(playerId));
        if (Array.isArray(goals)) result.shotsOnTarget = goals.length;
    }

    return result;
}

// Best-effort matcher from odds participant name to FotMob playerId
export function findPlayerIdByName(matchDetails, participantName) {
    if (!matchDetails || !matchDetails.playerStats || !participantName) return null;
    const normalize = (s) => String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ') // collapse
        .trim();

    const target = normalize(participantName);
    let fallbackId = null;
    for (const [id, p] of Object.entries(matchDetails.playerStats)) {
        const nameN = normalize(p?.name);
        if (!nameN) continue;
        if (nameN === target) return Number(id);
        if (target.includes(nameN) || nameN.includes(target)) fallbackId = Number(id);
    }
    return fallbackId;
}

export function getPlayerEvents(matchDetails, playerId) {
    const goals = getGoalEvents(matchDetails).filter(e => e?.playerId === playerId);
    const allCards = getCardEvents(matchDetails);
    console.log(`🔍 getPlayerEvents for playerId ${playerId}:`);
    console.log(`   - All cards found: ${allCards.length}`);
    console.log(`   - All cards data:`, allCards);
    
    const cards = allCards.filter(e => e?.playerId === playerId);
    console.log(`   - Cards for player ${playerId}: ${cards.length}`);
    console.log(`   - Player cards data:`, cards);
    
    return { goals, cards };
}