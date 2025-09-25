# UNIBET-API Live Matches Implementation Analysis

## Overview

The unibet-api app uses **Unibet's own API** (not Fotmob) to fetch live football matches. This analysis covers the complete implementation including API endpoints, data structure, caching mechanism, and frontend integration.

## 🎯 **Data Source**

**Primary API:** `https://www.unibet.com.au/sportsbook-feeds/views/filter/football/all/matches`

- **Source:** Unibet's internal API (not Fotmob)
- **Purpose:** Comprehensive football matches data (live + upcoming)
- **Update Frequency:** Every 2 minutes via automatic cache refresh
- **Caching:** In-memory cache with 2-minute TTL

## 📊 **API Endpoints**

### 1. Main Live Matches Endpoint
```http
GET /api/live-matches
```

**Purpose:** Get currently live football matches only

**Response Structure:**
```json
{
  "success": true,
  "matches": [
    {
      "id": "1024001723",
      "name": "Manchester United vs Liverpool",
      "englishName": "Manchester United vs Liverpool",
      "homeName": "Manchester United",
      "awayName": "Liverpool",
      "start": "2025-01-15T15:30:00Z",
      "state": "STARTED",
      "sport": "FOOTBALL",
      "groupId": "1000094569",
      "group": "Premier League",
      "participants": [
        {"name": "Manchester United", "position": "home"},
        {"name": "Liverpool", "position": "away"}
      ],
      "parentName": "England",
      "leagueName": "Premier League",
      "liveData": {
        "score": "2-1",
        "period": "2nd Half",
        "minute": "67",
        "matchClock": {
          "running": true,
          "period": "2nd Half",
          "minute": "67"
        }
      }
    }
  ],
  "groupedMatches": {
    "England": {
      "name": "England",
      "leagues": {
        "Premier League": {
          "name": "Premier League",
          "matches": [...]
        }
      },
      "totalMatches": 5
    }
  },
  "totalMatches": 15,
  "lastUpdated": "2025-01-15T15:35:00Z",
  "lastError": null,
  "source": "all-football-cache-filtered"
}
```

### 2. All Football Matches Endpoint
```http
GET /api/all-football-matches
```

**Purpose:** Get all football matches (live + upcoming) with comprehensive grouping

**Response Structure:**
```json
{
  "success": true,
  "matches": [...], // All matches
  "liveMatches": [...], // Only live matches
  "upcomingMatches": [...], // Only upcoming matches
  "groupedByParent": {
    "England": {
      "name": "England",
      "leagues": {
        "Premier League": {
          "id": "1000094569",
          "name": "Premier League",
          "englishName": "Premier League",
          "termKey": "premier-league",
          "navigationUrl": "/betting/sports/filter/football/england/premier-league",
          "isInternational": false,
          "liveEvents": [...],
          "upcomingEvents": [...],
          "totalEvents": 20
        }
      },
      "totalMatches": 20,
      "liveMatches": 5,
      "upcomingMatches": 15
    }
  },
  "totalMatches": 45,
  "lastUpdated": "2025-01-15T15:35:00Z",
  "source": "cache",
  "statistics": {
    "totalMatches": 45,
    "liveMatches": 15,
    "upcomingMatches": 30,
    "parentCategories": 3,
    "totalLeagues": 8
  }
}
```

### 3. Manual Refresh Endpoint
```http
POST /api/live-matches/refresh
```

**Purpose:** Manually trigger cache refresh

**Response:**
```json
{
  "success": true,
  "lastUpdated": "2025-01-15T15:35:00Z",
  "totalMatches": 15,
  "source": "all-football-cache-filtered"
}
```

## 🔄 **Caching Mechanism**

### Cache Structure
```javascript
const ALL_FOOTBALL_CACHE = {
  matches: [],           // All football matches
  liveMatches: [],       // Only live matches (state: 'STARTED')
  upcomingMatches: [],    // Only upcoming matches (state: 'NOT_STARTED')
  groupedByParent: {},   // Organized by parent > league structure
  eventsById: {},        // Quick lookup by event ID
  totalMatches: 0,
  lastUpdated: null,
  lastError: null
};
```

### Cache Refresh Process
1. **Automatic Refresh:** Every 2 minutes
2. **Manual Refresh:** Via `/api/live-matches/refresh` endpoint
3. **Initial Load:** On server startup
4. **Error Handling:** Retry logic with exponential backoff

### Cache Refresh Function
```javascript
async function refreshAllFootballCache(reason = 'scheduled') {
  if (isRefreshingAllFootball) return; // prevent overlap
  isRefreshingAllFootball = true;
  
  try {
    const urlBuilder = () => `${config.ALL_FOOTBALL_API_URL}?includeParticipants=true&useCombined=true&ncid=${Date.now()}`;
    const response = await fetchWithRetry(urlBuilder, config.ALL_FOOTBALL_HEADERS, {
      retries: 4,
      minDelayMs: 400,
      maxDelayMs: 1800,
      timeoutMs: 12000,
      fallbackStripCookies: true,
    });

    const data = await response.json();
    // Process and update cache...
  } catch (err) {
    ALL_FOOTBALL_CACHE.lastError = err.message;
  } finally {
    isRefreshingAllFootball = false;
  }
}
```

## 🎨 **Frontend Implementation**

### HTML Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Unibet Live Football Dashboard</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <!-- Navigation -->
        <div class="navigation">
            <div class="nav-links">
                <a href="/" class="nav-link active">Live Matches</a>
                <a href="/upcoming-matches" class="nav-link">Upcoming Matches</a>
                <a href="/bets" class="nav-link">All Bets</a>
            </div>
        </div>

        <!-- Header -->
        <header class="header">
            <div class="header-content">
                <div class="logo">
                    <i class="fas fa-futbol"></i>
                    <h1>Unibet Live Football</h1>
                </div>
                <div class="status-indicator">
                    <div class="status-dot" id="statusDot"></div>
                    <span id="statusText">Connecting...</span>
                    <span class="last-update" id="lastUpdate"></span>
                </div>
            </div>
        </header>

        <!-- Controls -->
        <div class="controls">
            <button class="btn btn-primary" id="refreshBtn">
                <i class="fas fa-sync-alt"></i>
                Refresh Matches
            </button>
            <div class="auto-refresh">
                <label for="autoRefresh">Auto-refresh every 30s:</label>
                <input type="checkbox" id="autoRefresh" checked>
            </div>
        </div>

        <!-- Live Matches Container -->
        <div class="matches-container">
            <div class="matches-header">
                <h2>Live Football Matches</h2>
                <span class="match-count" id="matchCount">0 matches</span>
            </div>
            <div class="matches-grid" id="matchesGrid">
                <!-- Matches will be rendered here -->
            </div>
        </div>
    </div>
</body>
</html>
```

### JavaScript Implementation
```javascript
class LiveMatchesDashboard {
    constructor() {
        this.apiUrl = '/api/live-matches';
        this.refreshInterval = 1000; // 1 second
        this.autoRefreshTimer = null;
        this.currentData = null;
        
        this.initializeElements();
        this.bindEvents();
        this.startAutoRefresh();
        this.fetchData();
    }

    async fetchData() {
        try {
            this.showLoading();
            this.hideError();
            
            const response = await fetch(this.apiUrl);
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.message || 'API returned an error');
            }
            
            this.currentData = data;
            this.updateStatus(true);
            this.updateLastUpdate();
            this.renderMatches(data);
            
        } catch (error) {
            console.error('Error fetching live matches:', error);
            this.showError(error.message);
            this.updateStatus(false, 'Error');
        } finally {
            this.hideLoading();
        }
    }

    renderMatches(data) {
        if (!data.matches || data.matches.length === 0) {
            this.matchesGrid.innerHTML = '<p style="text-align: center; color: #718096; grid-column: 1 / -1;">No live football matches available</p>';
            this.matchCount.textContent = '0 matches';
            return;
        }

        this.matchCount.textContent = `${data.matches.length} live match${data.matches.length !== 1 ? 'es' : ''}`;

        // Group matches by parent and league for better organization
        let html = '';
        if (data.groupedMatches && Object.keys(data.groupedMatches).length > 0) {
            Object.keys(data.groupedMatches).forEach(parentName => {
                const parent = data.groupedMatches[parentName];
                
                // Add parent category header
                html += `
                    <div class="category-header" style="grid-column: 1 / -1;">
                        <h3>${this.escapeHtml(parentName)}</h3>
                    </div>
                `;
                
                // Add leagues within this parent
                Object.keys(parent.leagues).forEach(leagueName => {
                    const league = parent.leagues[leagueName];
                    
                    // Add league header
                    html += `
                        <div class="league-header" style="grid-column: 1 / -1;">
                            <h4>${this.escapeHtml(leagueName)} (${league.matches.length} match${league.matches.length !== 1 ? 'es' : ''})</h4>
                        </div>
                    `;
                    
                    // Add matches for this league
                    league.matches.forEach(match => {
                        html += this.createMatchCard(match);
                    });
                });
            });
        } else {
            // Fallback to flat list if grouping isn't available
            html = data.matches.map(match => this.createMatchCard(match)).join('');
        }

        this.matchesGrid.innerHTML = html;
    }

    createMatchCard(match) {
        const homeTeam = match.participants?.find(p => p.home)?.name || match.homeName || 'Unknown';
        const awayTeam = match.participants?.find(p => !p.home)?.name || match.awayName || 'Unknown';
        const score = match.liveData?.score;
        const matchClock = match.liveData?.matchClock;
        const startTime = new Date(match.start).toLocaleTimeString();
        
        let statusText = 'Live';
        let statusClass = 'live';
        
        if (matchClock) {
            if (matchClock.running) {
                statusText = `${matchClock.period} - ${matchClock.minute}'`;
                statusClass = 'live';
            } else {
                statusText = 'HT';
                statusClass = 'half-time';
            }
        }
        
        return `
            <div class="match-card">
                <div class="match-teams">
                    <div class="team home-team">${this.escapeHtml(homeTeam)}</div>
                    <div class="match-score">${score || '0-0'}</div>
                    <div class="team away-team">${this.escapeHtml(awayTeam)}</div>
                </div>
                <div class="match-status">
                    <span class="status ${statusClass}">${statusText}</span>
                    <span class="match-time">Started: ${startTime}</span>
                </div>
                <div class="match-league">${this.escapeHtml(match.leagueName)}</div>
                <div class="match-actions">
                    <button class="btn btn-secondary" onclick="viewMatchDetails('${match.id}')">
                        <i class="fas fa-arrow-right"></i>
                        View Markets
                    </button>
                </div>
            </div>
        `;
    }
}
```

## 🔧 **Configuration**

### API Configuration
```javascript
// All Football Matches API Configuration (Live + Upcoming)
const ALL_FOOTBALL_API_URL = 'https://www.unibet.com.au/sportsbook-feeds/views/filter/football/all/matches';

// Headers for All Football Matches API
const ALL_FOOTBALL_HEADERS = {
    'accept': '*/*',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'accept-language': 'en-US,en;q=0.9',
    'cookie': 'INGRESSCOOKIE_SPORTSBOOK_FEEDS=...', // Long cookie string
    'priority': 'u=1, i',
    'referer': 'https://www.unibet.com.au/betting/sports/filter/football/all/matches',
    'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
};
```

## 📋 **Key Features**

### 1. **Real-time Updates**
- Automatic refresh every 2 minutes
- Manual refresh capability
- Live status indicators
- Real-time match clocks

### 2. **Data Organization**
- Grouped by parent (country/region)
- Sub-grouped by league
- Hierarchical structure for easy navigation
- Match count per league

### 3. **Error Handling**
- Retry logic with exponential backoff
- Graceful error display
- Fallback to cached data
- Connection status indicators

### 4. **Performance Optimization**
- In-memory caching
- Efficient data processing
- Minimal API calls
- Background refresh

## 🎯 **Integration Points**

### For Your Bet-App Integration:

1. **API Endpoint:** Use `/api/live-matches` (not Fotmob)
2. **Data Source:** Unibet's internal API
3. **Caching:** Implement similar 2-minute cache refresh
4. **Data Structure:** Use the `groupedMatches` structure for organized display
5. **Frontend:** Adapt the JavaScript dashboard class for React/Redux

### Key Differences from Fotmob:
- **Data Source:** Unibet API vs Fotmob API
- **Data Structure:** More comprehensive match data
- **Caching:** Built-in caching vs external API calls
- **Real-time:** Better live match support
- **Organization:** Hierarchical grouping by country/league

## 📊 **Response Data Structure**

### Match Object Structure:
```javascript
{
  id: "1024001723",                    // Unique match ID
  name: "Manchester United vs Liverpool",
  englishName: "Manchester United vs Liverpool",
  homeName: "Manchester United",
  awayName: "Liverpool",
  start: "2025-01-15T15:30:00Z",      // ISO timestamp
  state: "STARTED",                    // STARTED, NOT_STARTED, FINISHED
  sport: "FOOTBALL",
  groupId: "1000094569",              // League ID
  group: "Premier League",            // League name
  participants: [...],                // Team details
  parentName: "England",              // Country/region
  leagueName: "Premier League",       // League name
  liveData: {                         // Live match data
    score: "2-1",
    period: "2nd Half",
    minute: "67",
    matchClock: {
      running: true,
      period: "2nd Half",
      minute: "67"
    }
  }
}
```

This implementation provides a robust, real-time live matches system using Unibet's own API with comprehensive caching and error handling.





// 1024912623

// 1024912623