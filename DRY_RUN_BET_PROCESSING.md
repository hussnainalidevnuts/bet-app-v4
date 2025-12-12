# Dry Run: Bet Processing Timeline

## Scenario: Match starts at 10:45 PM (Pakistan Time)

### Match Timeline:
- **Match Start**: 10:45 PM (22:45 PKT)
- **Match Duration**: ~90 minutes (regular time) + ~15 minutes (extra time/injury time) = **~105 minutes total**
- **Expected Match End**: 10:45 PM + 105 minutes = **12:30 AM (next day)**

### Current Bet Processing Logic:

#### Option 1: Time-Based Filtering (Current - 135 minutes threshold)
- **Threshold**: Matches started **135 minutes (2h 15min)** ago
- **Processing Time**: 10:45 PM + 135 minutes = **1:00 AM (next day)**
- **Status**: Match would be processed at 1:00 AM, even if it finished earlier

#### Option 2: Unibet API Status Check (Recommended)
- **Check Frequency**: Every **5 seconds** (via `processPendingBets` job)
- **Match Status Check**: `matchData.state?.id === 5` (5 = FINISHED)
- **Processing Time**: As soon as Unibet API reports match as finished
- **Expected Processing**: **~12:35 AM - 12:40 AM** (5-10 minutes after match ends)

### Detailed Timeline:

```
10:45 PM  → Match starts
11:30 PM  → Half-time (45 minutes)
11:45 PM  → Second half starts
12:30 AM  → Match ends (90 min + 15 min extra time)
12:35 AM  → Unibet API updates match status to FINISHED (state.id = 5)
12:35 AM  → Next `processPendingBets` job runs (every 5 seconds)
12:35 AM  → Bet processing starts (checks Unibet API, finds match finished)
12:35 AM  → Bets are processed and updated
```

### Key Points:

1. **Cache Refresh**:
   - **Scheduled**: 9:30 PM PKT daily (force refresh)
   - **Server Start**: Immediate refresh (force refresh)
   - **Other Times**: Only refreshes if data missing or invalid

2. **Bet Processing**:
   - **Frequency**: Every 5 seconds
   - **Trigger**: Unibet API match status = FINISHED (state.id = 5)
   - **Delay**: ~5-10 minutes after match ends (API update delay)

3. **Recommendation**:
   - Use Unibet API status check instead of time-based filtering
   - More accurate and faster processing
   - Handles matches that finish early or late

### Example Calculation:

**Match**: Team A vs Team B
- **Start**: 10:45 PM (Dec 11, 2025)
- **End**: 12:30 AM (Dec 12, 2025)
- **Unibet Status Update**: ~12:35 AM
- **Bet Processing**: ~12:35 AM - 12:40 AM

**Result**: Pending bets will be processed approximately **5-10 minutes after match ends**.


