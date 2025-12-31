// Next.js API Route - Proxy for Backend League Mapping API (handles CORS)
import { NextResponse } from 'next/server';

// In-memory cache to prevent multiple simultaneous requests
let cache = {
  data: null,
  lastUpdated: null,
  isRefreshing: false
};

const CACHE_DURATION = 3600000; // 1 hour in milliseconds

export async function GET(request) {
  try {
    // Check if we have cached data that's still fresh
    if (cache.data && cache.lastUpdated && Date.now() - cache.lastUpdated < CACHE_DURATION) {
      console.log(`✅ [NEXT API] Returning cached league mapping (age: ${Math.floor((Date.now() - cache.lastUpdated) / 1000)}s)`);
      return NextResponse.json(cache.data);
    }
    
    // If already refreshing, wait for the current request instead of making a new one
    if (cache.isRefreshing) {
      const maxWait = 5000;
      const startWait = Date.now();
      while (cache.isRefreshing && (Date.now() - startWait) < maxWait) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      // If cache was updated, return fresh data
      if (cache.data && cache.lastUpdated && Date.now() - cache.lastUpdated < CACHE_DURATION) {
        console.log(`✅ [NEXT API] Returning fresh league mapping after waiting`);
        return NextResponse.json(cache.data);
      }
    }
    
    // Mark as refreshing
    cache.isRefreshing = true;
    
    // Use backend API URL from env or default to localhost:4000 (backend port)
    // Check both NEXT_PUBLIC_API_URL and API_URL (server-side env)
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 
                       process.env.API_URL || 
                       'http://localhost:4000';
    const url = `${backendUrl}/api/admin/leagues/mapping`;
    
    console.log(`🔍 [NEXT API] Fetching league mapping from backend: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'accept': 'application/json',
        'cache-control': 'no-cache'
      },
      signal: AbortSignal.timeout(5000) // 5 seconds timeout
    });
    
    if (!response.ok) {
      throw new Error(`Backend API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log(`✅ [NEXT API] Successfully fetched league mapping from backend`);
    console.log(`📊 [NEXT API] Mapping data:`, {
      totalLeagues: data.data?.totalLeagues || 0,
      mappingCount: Object.keys(data.data?.unibetToFotmobMapping || {}).length,
      allowedLeagueIdsCount: data.data?.allowedLeagueIds?.length || 0
    });
    
    // Update cache
    cache.data = data;
    cache.lastUpdated = Date.now();
    cache.isRefreshing = false;
    
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      }
    });
    
  } catch (error) {
    cache.isRefreshing = false;
    console.error(`❌ [NEXT API] Error fetching league mapping:`, error);
    
    // If we have stale cache, return it with a warning
    if (cache.data) {
      console.log('⚠️ [NEXT API] Returning stale cached data due to error');
      return NextResponse.json({
        ...cache.data,
        warning: 'Using cached data due to backend error',
        cacheAge: cache.lastUpdated ? Date.now() - cache.lastUpdated : null
      });
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch league mapping',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

