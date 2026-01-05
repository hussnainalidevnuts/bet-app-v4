import { downloadLeagueMappingClean } from './cloudinaryCsvLoader.js';

// Cache for league mapping data
let leagueMappingCache = null;

/**
 * Load and parse the league mapping CSV file from Cloudinary
 * @returns {Object} - Object with allowed league names and IDs
 */
export async function loadLeagueMapping() {
  if (leagueMappingCache) {
    return leagueMappingCache;
  }

  try {
    // Download CSV from Cloudinary (with local file fallback)
    console.log('📥 Loading league mapping from Cloudinary...');
    const csvContent = await downloadLeagueMappingClean();
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    // Skip header line
    const dataLines = lines.slice(1);
    
    const allowedLeagueNames = new Set();
    const allowedLeagueIds = new Set();
    
    dataLines.forEach(line => {
      if (line.trim()) {
        const [unibetId, unibetName, fotmobId, fotmobName, matchType, country] = line.split(',');
        
        if (unibetName && unibetName.trim()) {
          // Add both exact name and cleaned name variations
          allowedLeagueNames.add(unibetName.trim());
          allowedLeagueNames.add(unibetName.trim().toLowerCase());
          
          // Also add Fotmob name for matching
          if (fotmobName && fotmobName.trim()) {
            allowedLeagueNames.add(fotmobName.trim());
            allowedLeagueNames.add(fotmobName.trim().toLowerCase());
          }
        }
        
        if (unibetId && unibetId.trim()) {
          allowedLeagueIds.add(unibetId.trim());
        }
      }
    });

    leagueMappingCache = {
      allowedLeagueNames,
      allowedLeagueIds,
      totalLeagues: allowedLeagueNames.size
    };

    console.log(`✅ Loaded ${leagueMappingCache.totalLeagues} allowed leagues from CSV`);
    console.log(`📋 Sample leagues:`, Array.from(allowedLeagueNames).slice(0, 10));
    
    return leagueMappingCache;
  } catch (error) {
    console.error('❌ Error loading league mapping CSV:', error.message);
    return { allowedLeagueNames: new Set(), allowedLeagueIds: new Set() };
  }
}

/**
 * Check if a league ID is in the allowed list
 * @param {string|number} leagueId - The Unibet league ID to check
 * @returns {boolean} - Whether the league is allowed
 */
export async function isLeagueAllowed(leagueId) {
  if (!leagueId) {
    return false;
  }

  const { allowedLeagueIds } = await loadLeagueMapping();
  
  // Convert to string for comparison
  const leagueIdStr = String(leagueId);
  
  // Check exact match
  if (allowedLeagueIds.has(leagueIdStr)) {
    return true;
  }
  
  return false;
}

/**
 * Check if a league name is in the allowed list (legacy function for backward compatibility)
 * @param {string} leagueName - The league name to check
 * @returns {boolean} - Whether the league is allowed
 */
export async function isLeagueNameAllowed(leagueName) {
  if (!leagueName || typeof leagueName !== 'string') {
    return false;
  }

  const { allowedLeagueNames } = await loadLeagueMapping();
  
  // Check exact match
  if (allowedLeagueNames.has(leagueName)) {
    return true;
  }
  
  // Check case-insensitive match
  if (allowedLeagueNames.has(leagueName.toLowerCase())) {
    return true;
  }
  
  // Check if any allowed league name contains this league name (partial match)
  for (const allowedName of allowedLeagueNames) {
    if (allowedName.toLowerCase().includes(leagueName.toLowerCase()) || 
        leagueName.toLowerCase().includes(allowedName.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

/**
 * Filter matches to only include those from allowed leagues
 * @param {Array} matches - Array of match objects
 * @returns {Array} - Filtered array of matches
 */
export async function filterMatchesByAllowedLeagues(matches) {
  if (!Array.isArray(matches)) {
    return [];
  }

  const { allowedLeagueIds } = await loadLeagueMapping();
  
  const filteredMatches = matches.filter(match => {
    // ONLY use groupId field (Unibet league ID) - STRICT METHOD
    if (match.groupId && isLeagueAllowed(match.groupId)) {
      return true;
    }
    
    return false;
  });

  console.log(`🔍 League filtering: ${matches.length} total matches → ${filteredMatches.length} allowed matches`);
  
  return filteredMatches;
}

/**
 * Get statistics about league filtering
 * @returns {Object} - Statistics about the league mapping
 */
export async function getLeagueFilterStats() {
  const mapping = await loadLeagueMapping();
  return {
    totalAllowedLeagues: mapping.totalLeagues || 0,
    allowedLeagueNames: Array.from(mapping.allowedLeagueNames || []),
    allowedLeagueIds: Array.from(mapping.allowedLeagueIds || [])
  };
}
