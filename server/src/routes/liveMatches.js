import express from 'express';
import axios from '../config/axios-proxy.js';

const router = express.Router();

// Cache for live data to reduce API calls
const liveDataCache = new Map();
const CACHE_DURATION = 30000; // 30 seconds

// Clean up cache periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of liveDataCache.entries()) {
        if (now - value.timestamp > CACHE_DURATION) {
            liveDataCache.delete(key);
        }
    }
}, 60000); // Clean every minute

// Get live match data
router.get('/:matchId/live', async (req, res) => {
    try {
        const { matchId } = req.params;
        
        // Check cache first
        const cached = liveDataCache.get(matchId);
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
            console.log(`📦 Returning cached live data for match ${matchId}`);
            return res.json({
                success: true,
                liveData: cached.data,
                cached: true
            });
        }

        // Fetch from Unibet API
        const unibetResponse = await axios.get('https://www.unibet.com.au/sportsbook-feeds/breadcrumbs/live', {
            headers: {
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
                'Sec-CH-UA': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
                'Sec-CH-UA-Mobile': '?0',
                'Sec-CH-UA-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'Referer': 'https://www.unibet.com.au/betting/sports/event/live/1024500222'
            }
        });

        // Find the specific match
        let matchData = null;
        for (const sport of unibetResponse.data.sports) {
            for (const group of sport.groups) {
                const match = group.events.find(event => event.id.toString() === matchId);
                if (match) {
                    matchData = match;
                    break;
                }
            }
            if (matchData) break;
        }

        if (!matchData) {
            return res.status(404).json({
                success: false,
                error: 'Match not found in live data',
                message: 'This match is not currently live or not available in the live matches feed',
                matchId: matchId
            });
        }

        // Cache the result
        liveDataCache.set(matchId, {
            data: matchData.liveData,
            timestamp: Date.now()
        });

        console.log(`✅ Fetched live data for match ${matchId}:`, matchData.liveData?.matchClock);

        res.json({
            success: true,
            liveData: matchData.liveData,
            cached: false
        });

    } catch (error) {
        console.error('❌ Error fetching live match data:', error);
        
        // Return cached data if available, even if expired
        const cached = liveDataCache.get(req.params.matchId);
        if (cached) {
            console.log(`📦 Returning expired cached data for match ${req.params.matchId}`);
            return res.json({
                success: true,
                liveData: cached.data,
                cached: true,
                warning: 'Using cached data - API unavailable'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to fetch live match data'
        });
    }
});

// Get all live matches
router.get('/', async (req, res) => {
    try {
        const unibetResponse = await axios.get('https://www.unibet.com.au/sportsbook-feeds/breadcrumbs/live', {
            headers: {
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
                'Sec-CH-UA': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
                'Sec-CH-UA-Mobile': '?0',
                'Sec-CH-UA-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'Referer': 'https://www.unibet.com.au/betting/sports/event/live/1024500222'
            }
        });

        res.json({
            success: true,
            data: unibetResponse.data
        });

    } catch (error) {
        console.error('❌ Error fetching live matches:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch live matches'
        });
    }
});

export default router;
