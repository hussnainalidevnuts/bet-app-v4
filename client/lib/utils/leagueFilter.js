// League filtering utility for Next.js API routes
// Fetches filtering data from backend API (instead of reading CSV)

// In-memory cache
let leagueMappingCache = null;
let mappingPromise = null;

/**
 * Fetch league mapping from backend API
 * Detects if running server-side (Next.js API route) or client-side
 * @returns {Promise<Object>}
 */
async function fetchLeagueMappingFromBackend() {
  try {
    // Detect if running server-side (Next.js API route) or client-side
    const isServerSide = typeof window === 'undefined';
    
    let url;
    if (isServerSide) {
      // Server-side: Call backend directly (bypass Next.js API route)
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 
                         process.env.API_URL || 
                         'http://localhost:4000';
      url = `${backendUrl}/api/admin/leagues/mapping`;
    } else {
      // Client-side: Use Next.js API route (handles CORS)
      url = '/api/admin/leagues/mapping';
    }
    
    const response = await fetch(url, {
      headers: {
        'Cache-Control': 'max-age=3600', // Cache for 1 hour
        'accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Backend API returned ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.data) {
      const { allowedLeagueIds, allowedLeagueNames, totalLeagues } = result.data;
      
      console.log(`✅ [NEXT API] Loaded ${totalLeagues} allowed leagues from backend`);
      
      return {
        allowedLeagueNames: new Set(allowedLeagueNames),
        allowedLeagueIds: new Set(allowedLeagueIds),
        totalLeagues
      };
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    console.error('❌ [NEXT API] Error fetching league mapping from backend:', error.message);
    // ✅ FIX: Return empty sets but don't throw - allows matches to show if mapping fails
    // This prevents blocking the entire page if league mapping API is down
    // Note: This means all matches will pass filtering if mapping fails (fail-open approach)
    console.warn('⚠️ [NEXT API] League mapping failed - allowing all matches through (fail-open)');
    return { 
      allowedLeagueNames: new Set(), 
      allowedLeagueIds: new Set(), 
      totalLeagues: 0 
    };
  }
}

/**
 * Load and parse the league mapping from backend API
 * @returns {Promise<Object>} - Object with allowed league names and IDs
 */
export async function loadLeagueMapping() {
  // Return cached data if available
  if (leagueMappingCache) {
    return leagueMappingCache;
  }
  
  // If already fetching, wait for that promise
  if (mappingPromise) {
    return mappingPromise;
  }
  
  // Start fetching
  mappingPromise = fetchLeagueMappingFromBackend();
  leagueMappingCache = await mappingPromise;
  mappingPromise = null;
  
  return leagueMappingCache;
}

/**
 * Check if a league ID is in the allowed list
 * @param {string|number} leagueId - The Unibet league ID to check
 * @returns {Promise<boolean>} - Whether the league is allowed
 */
export async function isLeagueAllowed(leagueId) {
  if (!leagueId) {
    return false;
  }

  const { allowedLeagueIds } = await loadLeagueMapping();
  
  // Convert to string for comparison
  const leagueIdStr = String(leagueId);
  
  // Check exact match
  return allowedLeagueIds.has(leagueIdStr);
}

/**
 * Filter matches to only include those from allowed leagues
 * @param {Array} matches - Array of match objects
 * @returns {Promise<Array>} - Filtered array of matches
 */
export async function filterMatchesByAllowedLeagues(matches) {
  if (!Array.isArray(matches)) {
    return [];
  }

  const { allowedLeagueIds } = await loadLeagueMapping();
  
  const filteredMatches = matches.filter(match => {
    // ONLY use groupId field (Unibet league ID) - STRICT METHOD (same as backend)
    const hasGroupId = !!match.groupId;
    const isAllowed = hasGroupId && allowedLeagueIds.has(String(match.groupId));
    
    return hasGroupId && isAllowed;
  });

  console.log(`🔍 [NEXT API] League filtering: ${matches.length} total matches → ${filteredMatches.length} allowed matches`);
  
  return filteredMatches;
}

/**
 * Get statistics about league filtering
 * @returns {Promise<Object>} - Statistics about the league mapping
 */
export async function getLeagueFilterStats() {
  const mapping = await loadLeagueMapping();
  return {
    totalAllowedLeagues: mapping.totalLeagues || 0,
    allowedLeagueNames: Array.from(mapping.allowedLeagueNames || []),
    allowedLeagueIds: Array.from(mapping.allowedLeagueIds || [])
  };
}

