// Utility to get Fotmob logo URL from Unibet league ID
// Fetches mapping from backend API (instead of hardcoded CSV data)

// In-memory cache
let UNIBET_TO_FOTMOB_MAPPING = null;
let mappingPromise = null; // To prevent multiple simultaneous fetches

/**
 * Fetch Unibet→Fotmob mapping from backend API
 * Detects if running server-side (SSR) or client-side
 * @returns {Promise<Object>} - Mapping object
 */
async function fetchMappingFromBackend() {
  try {
    // Detect if running server-side (SSR) or client-side
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
      throw new Error(`API returned ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success && result.data) {
      console.log(`✅ [leagueUtils] Loaded ${Object.keys(result.data.unibetToFotmobMapping).length} league mappings from backend`);
      return result.data.unibetToFotmobMapping;
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    console.error('❌ [leagueUtils] Failed to fetch mapping from backend:', error);
    // Return empty mapping as fallback
    return {};
  }
}

/**
 * Initialize mapping (lazy load on first use)
 */
async function initializeMapping() {
  if (UNIBET_TO_FOTMOB_MAPPING) {
    return UNIBET_TO_FOTMOB_MAPPING;
  }
  
  // If already fetching, wait for that promise
  if (mappingPromise) {
    return mappingPromise;
  }
  
  // Start fetching
  mappingPromise = fetchMappingFromBackend();
  UNIBET_TO_FOTMOB_MAPPING = await mappingPromise;
  mappingPromise = null; // Clear promise after completion
  
  return UNIBET_TO_FOTMOB_MAPPING;
}

/**
 * Get Fotmob logo URL from Unibet league ID
 * @param {string|number} unibetId - Unibet league ID
 * @returns {string|null} - Fotmob logo URL or null
 */
export const getFotmobLogoByUnibetId = (unibetId) => {
  if (!unibetId) {
    return null;
  }
  
  // If mapping not loaded yet, return null (component will re-render after load)
  if (!UNIBET_TO_FOTMOB_MAPPING) {
    // Trigger lazy load
    initializeMapping().catch(err => {
      console.error('❌ [leagueUtils] Error initializing mapping:', err);
    });
    return null;
  }
  
  const fotmobId = UNIBET_TO_FOTMOB_MAPPING[String(unibetId)];
  
  if (!fotmobId) {
    return null;
  }
  
  const url = `https://images.fotmob.com/image_resources/logo/leaguelogo/${fotmobId}.png`;
  return url;
};

/**
 * Preload mapping (call this on app initialization)
 * @returns {Promise<void>}
 */
export const preloadLeagueMapping = async () => {
  try {
    await initializeMapping();
    console.log('✅ [leagueUtils] League mapping preloaded');
  } catch (error) {
    console.error('❌ [leagueUtils] Failed to preload mapping:', error);
  }
};
