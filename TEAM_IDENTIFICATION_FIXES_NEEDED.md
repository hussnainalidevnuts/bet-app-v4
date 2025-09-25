# Team Identification Fixes Needed

## Overview
This document identifies all markets that need the same team identification fix applied to Team Total Goals. These markets are currently using the wrong approach of matching bet team names with Fotmob team names instead of matching market team names with bet team names.

---

## Markets That Need Fixing

### **1. Team Total Cards** ✅ **COMPLETED**

**Location**: `server/src/unibet-calc/bet-outcome-calculator.js` (lines 1426-1485)

**Fixed Problem**:
```javascript
// Extract team name from market name and match with bet team names
const marketNameLower = String(bet.marketName || '').toLowerCase();
let teamFromMarket = '';

// Handle different market name formats: "Total Cards by Team" or "Total Cards - Team"
if (marketNameLower.includes(' by ')) {
    teamFromMarket = marketNameLower.split(' by ')[1] || '';
} else if (marketNameLower.includes(' - ')) {
    teamFromMarket = marketNameLower.split(' - ')[1] || '';
}

// Match team from market with bet team names (not Fotmob names!)
const betHomeLower = String(bet.homeName || '').toLowerCase();
const betAwayLower = String(bet.awayName || '').toLowerCase();

if (teamFromMarket.includes(betHomeLower) || betHomeLower.includes(teamFromMarket)) {
    targetIsHome = true;
} else if (teamFromMarket.includes(betAwayLower) || betAwayLower.includes(teamFromMarket)) {
    targetIsAway = true;
}
```

**Market Examples**:
- `"Total Cards by RFC de Liege"`
- `"Total Cards - SK Beveren"`

**Status**: ✅ **FIXED** - Now uses correct team identification logic

---

### **2. Team Total Corners** ✅ **COMPLETED**

**Location**: `server/src/unibet-calc/bet-outcome-calculator.js` (lines 1602-1665)

**Fixed Problem**:
```javascript
// Extract team name from market name and match with bet team names
const marketNameLower = String(bet.marketName || '').toLowerCase();
let teamFromMarket = '';

// Handle different market name formats: "Total Corners by Team" or "Total Corners - Team"
if (marketNameLower.includes(' by ')) {
    teamFromMarket = marketNameLower.split(' by ')[1] || '';
} else if (marketNameLower.includes(' - ')) {
    teamFromMarket = marketNameLower.split(' - ')[1] || '';
}

// Match team from market with bet team names (not Fotmob names!)
const betHomeLower = String(bet.homeName || '').toLowerCase();
const betAwayLower = String(bet.awayName || '').toLowerCase();

if (teamFromMarket.includes(betHomeLower) || betHomeLower.includes(teamFromMarket)) {
    targetIsHome = true;
} else if (teamFromMarket.includes(betAwayLower) || betAwayLower.includes(teamFromMarket)) {
    targetIsAway = true;
}
```

**Market Examples**:
- `"Total Corners by RFC de Liege"`
- `"Total Corners - SK Beveren"`

**Status**: ✅ **FIXED** - Now uses correct team identification logic

---

### **3. Team Red Cards** ✅ **COMPLETED**

**Location**: `server/src/unibet-calc/bet-outcome-calculator.js` (lines 1531-1595)

**Fixed Problem**:
```javascript
// Extract team name from market name and match with bet team names
const marketNameLower = String(bet.marketName || '').toLowerCase();
let teamFromMarket = '';

// Handle different market name formats: "Red Card by Team" or "Team Red Cards - Team"
if (marketNameLower.includes(' by ')) {
    teamFromMarket = marketNameLower.split(' by ')[1] || '';
} else if (marketNameLower.includes(' - ')) {
    teamFromMarket = marketNameLower.split(' - ')[1] || '';
} else if (marketNameLower.includes('given a red card')) {
    // Extract team name from "Team given a red card" format
    const parts = marketNameLower.split('given a red card');
    if (parts.length > 0) {
        teamFromMarket = parts[0].trim();
    }
}

// Match team from market with bet team names (not Fotmob names!)
const betHomeLower = String(bet.homeName || '').toLowerCase();
const betAwayLower = String(bet.awayName || '').toLowerCase();

if (teamFromMarket.includes(betHomeLower) || betHomeLower.includes(teamFromMarket)) {
    isHome = true;
} else if (teamFromMarket.includes(betAwayLower) || betAwayLower.includes(teamFromMarket)) {
    isAway = true;
}
```

**Market Examples**:
- `"Red Card by RFC de Liege"`
- `"Team Red Cards - SK Beveren"`
- `"RFC de Liege given a red card"`

**Status**: ✅ **FIXED** - Now uses correct team identification logic

---

### **4. Team Total Goals (Already Fixed)** ✅ **COMPLETED**

**Location**: `server/src/unibet-calc/bet-outcome-calculator.js` (lines 1026-1115)

**Status**: ✅ **FIXED** - Now uses correct logic

---

## Fix Pattern

### **❌ Wrong Approach (Current)**:
```javascript
const { homeName, awayName } = getTeamNames(matchDetails); // Fotmob names
const name = String(bet.marketName || '').toLowerCase();
const targetIsHome = name.includes(this.normalizeTeamName(homeName).toLowerCase());
```

### **✅ Correct Approach (Fixed)**:
```javascript
// Extract team name from market name
const teamFromMarket = String(bet.marketName).toLowerCase().split(' by ')[1] || '';
// Match with bet team names (not Fotmob names)
const betHomeLower = String(bet.homeName || '').toLowerCase();
const betAwayLower = String(bet.awayName || '').toLowerCase();

const targetIsHome = teamFromMarket.includes(betHomeLower) || betHomeLower.includes(teamFromMarket);
const targetIsAway = teamFromMarket.includes(betAwayLower) || betAwayLower.includes(teamFromMarket);
```

---

## Implementation Plan

### **Phase 1: High Priority Markets**
1. ✅ **COMPLETED** - Team Total Goals
2. ✅ **COMPLETED** - Team Total Cards
3. ✅ **COMPLETED** - Team Total Corners

### **Phase 2: Medium Priority Markets**
4. ✅ **COMPLETED** - Team Red Cards

### **Phase 3: Additional Markets Found**
5. ✅ **COMPLETED** - Exact Winning Margin
6. ✅ **COMPLETED** - Asian Handicap

### **Phase 4: Verification**
7. 🔄 **NEXT** - Test all team-based markets
8. 🔄 **NEXT** - Ensure no regression

---

### **5. Exact Winning Margin** ✅ **COMPLETED**

**Location**: `server/src/unibet-calc/bet-outcome-calculator.js` (lines 883-945)

**Fixed Problem**:
```javascript
// Extract team name from selection and match with bet team names (not Fotmob names!)
const selectionLower = selection.toLowerCase();
const betHomeLower = String(bet.homeName || '').toLowerCase();
const betAwayLower = String(bet.awayName || '').toLowerCase();

// Check if selection contains bet home team name
if (selectionLower.includes(betHomeLower) || betHomeLower.includes(selectionLower.split(' to win by')[0]?.trim())) {
    selSide = 'home';
} else if (selectionLower.includes(betAwayLower) || betAwayLower.includes(selectionLower.split(' to win by')[0]?.trim())) {
    selSide = 'away';
}
```

**Market Examples**:
- `"Juventude-RS to win by 1"`
- `"Corinthians-SP to win by 2"`

**Status**: ✅ **FIXED** - Now uses correct team identification logic

---

### **6. Asian Handicap** ✅ **COMPLETED**

**Location**: `server/src/unibet-calc/bet-outcome-calculator.js` (lines 987-1036)

**Fixed Problem**:
```javascript
// Match selection with bet team names (not Fotmob names!)
const betHomeLower = String(bet.homeName || '').toLowerCase();
const betAwayLower = String(bet.awayName || '').toLowerCase();

// Check if selection contains bet home team name
if (selectionTeam.includes(betHomeLower) || betHomeLower.includes(selectionTeam)) {
    homePicked = true;
} else if (selectionTeam.includes(betAwayLower) || betAwayLower.includes(selectionTeam)) {
    awayPicked = true;
} else if (selectionTeam === '1' || selectionTeam === 'home') {
    homePicked = true;
} else if (selectionTeam === '2' || selectionTeam === 'away') {
    awayPicked = true;
}
```

**Market Examples**:
- `"Asian Handicap - Home Team"`
- `"Asian Handicap - Away Team"`
- `"1"` (numeric selection)
- `"home"` (text selection)

**Status**: ✅ **FIXED** - Now uses correct team identification logic

---

## Testing Strategy

### **Test Cases for Each Market**:
1. **Home Team Bet**: Market name contains home team name
2. **Away Team Bet**: Market name contains away team name
3. **Name Variations**: Different team name formats (RFC de Liege vs FC Liege)
4. **Edge Cases**: Missing team names, malformed market names

### **Expected Results**:
- ✅ Correct team identification
- ✅ Correct score/statistic calculation
- ✅ Proper win/loss determination

---

## Files to Modify

- `server/src/unibet-calc/bet-outcome-calculator.js` (main file with all market logic)

---

## Notes

- **Root Cause**: All team-based markets were using Fotmob team names for matching instead of bet team names
- **Impact**: High - affects all team-specific betting markets
- **Complexity**: Medium - requires careful testing to ensure no regression
- **Priority**: High - affects user experience and bet accuracy

---

*Created: 2025-01-25*
*Status: Ready for systematic implementation*
