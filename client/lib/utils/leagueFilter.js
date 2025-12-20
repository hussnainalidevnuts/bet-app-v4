// League filtering utility for Next.js API routes
// Same logic as backend server/src/utils/leagueFilter.js

import fs from 'fs';
import path from 'path';

// Cache for league mapping data
let leagueMappingCache = null;

/**
 * Load and parse the league mapping CSV file
 * @returns {Object} - Object with allowed league names and IDs
 */
export function loadLeagueMapping() {
  if (leagueMappingCache) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/36e9cd0b-a351-407e-8f20-cf67918d6e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leagueFilter.js:15',message:'loadLeagueMapping - using cached data',data:{totalLeagues:leagueMappingCache.totalLeagues,allowedIdsCount:leagueMappingCache.allowedLeagueIds.size},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return leagueMappingCache;
  }

  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/36e9cd0b-a351-407e-8f20-cf67918d6e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leagueFilter.js:20',message:'loadLeagueMapping - starting CSV load',data:{cwd:process.cwd()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    // Path to the CSV file - try multiple possible locations
    const possiblePaths = [
      path.join(process.cwd(), 'server/src/unibet-calc/league_mapping_clean.csv'), // From client to server
      path.join(process.cwd(), 'league_mapping_clean.csv'), // Root directory
      path.join(process.cwd(), '..', 'server/src/unibet-calc/league_mapping_clean.csv'), // Alternative path
    ];
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/36e9cd0b-a351-407e-8f20-cf67918d6e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leagueFilter.js:25',message:'loadLeagueMapping - checking CSV paths',data:{possiblePaths,path0Exists:fs.existsSync(possiblePaths[0]),path1Exists:fs.existsSync(possiblePaths[1]),path2Exists:fs.existsSync(possiblePaths[2])},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    let csvPath = null;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        csvPath = testPath;
        break;
      }
    }
    
    if (!csvPath) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/36e9cd0b-a351-407e-8f20-cf67918d6e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leagueFilter.js:35',message:'loadLeagueMapping - CSV NOT FOUND',data:{possiblePaths},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      console.error('❌ [NEXT API] League mapping CSV file not found in any of these locations:');
      possiblePaths.forEach((testPath, index) => {
        console.error(`   ${index + 1}. ${testPath}`);
      });
      return { allowedLeagueNames: new Set(), allowedLeagueIds: new Set(), totalLeagues: 0 };
    }
    
    console.log('✅ [NEXT API] Found CSV file at:', csvPath);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/36e9cd0b-a351-407e-8f20-cf67918d6e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leagueFilter.js:44',message:'loadLeagueMapping - CSV found',data:{csvPath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/36e9cd0b-a351-407e-8f20-cf67918d6e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leagueFilter.js:48',message:'loadLeagueMapping - CSV read',data:{totalLines:lines.length,firstLine:lines[0]?.substring(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    // Skip header line
    const dataLines = lines.slice(1);
    
    const allowedLeagueNames = new Set();
    const allowedLeagueIds = new Set();
    
    dataLines.forEach((line, index) => {
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
        
        // #region agent log
        if (index < 5) {
          fetch('http://127.0.0.1:7242/ingest/36e9cd0b-a351-407e-8f20-cf67918d6e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leagueFilter.js:70',message:'loadLeagueMapping - parsing line',data:{lineIndex:index,unibetId,unibetName,parsedUnibetId:unibetId?.trim()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        }
        // #endregion
      }
    });

    leagueMappingCache = {
      allowedLeagueNames,
      allowedLeagueIds,
      totalLeagues: allowedLeagueIds.size
    };

    console.log(`✅ [NEXT API] Loaded ${leagueMappingCache.totalLeagues} allowed leagues from CSV`);
    console.log(`📋 [NEXT API] Sample league IDs:`, Array.from(allowedLeagueIds).slice(0, 10));
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/36e9cd0b-a351-407e-8f20-cf67918d6e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leagueFilter.js:85',message:'loadLeagueMapping - completed',data:{totalLeagues:leagueMappingCache.totalLeagues,allowedIdsCount:allowedLeagueIds.size,sampleIds:Array.from(allowedLeagueIds).slice(0,5)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    return leagueMappingCache;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/36e9cd0b-a351-407e-8f20-cf67918d6e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leagueFilter.js:88',message:'loadLeagueMapping - ERROR',data:{error:error.message,stack:error.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    console.error('❌ [NEXT API] Error loading league mapping CSV:', error.message);
    return { allowedLeagueNames: new Set(), allowedLeagueIds: new Set(), totalLeagues: 0 };
  }
}

/**
 * Check if a league ID is in the allowed list
 * @param {string|number} leagueId - The Unibet league ID to check
 * @returns {boolean} - Whether the league is allowed
 */
export function isLeagueAllowed(leagueId) {
  if (!leagueId) {
    return false;
  }

  const { allowedLeagueIds } = loadLeagueMapping();
  
  // Convert to string for comparison
  const leagueIdStr = String(leagueId);
  
  // Check exact match
  if (allowedLeagueIds.has(leagueIdStr)) {
    return true;
  }
  
  return false;
}

/**
 * Filter matches to only include those from allowed leagues
 * @param {Array} matches - Array of match objects
 * @returns {Array} - Filtered array of matches
 */
export function filterMatchesByAllowedLeagues(matches) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/36e9cd0b-a351-407e-8f20-cf67918d6e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leagueFilter.js:120',message:'filterMatchesByAllowedLeagues - entry',data:{matchesCount:Array.isArray(matches)?matches.length:'not-array',firstMatch:matches?.[0]?{id:matches[0].id,groupId:matches[0].groupId,state:matches[0].state}:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  if (!Array.isArray(matches)) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/36e9cd0b-a351-407e-8f20-cf67918d6e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leagueFilter.js:125',message:'filterMatchesByAllowedLeagues - not array',data:{matchesType:typeof matches},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return [];
  }

  const { allowedLeagueIds } = loadLeagueMapping();
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/36e9cd0b-a351-407e-8f20-cf67918d6e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leagueFilter.js:130',message:'filterMatchesByAllowedLeagues - before filter',data:{allowedIdsCount:allowedLeagueIds.size,sampleAllowedIds:Array.from(allowedLeagueIds).slice(0,5),sampleMatchGroupIds:matches.slice(0,5).map(m=>m.groupId)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  const filteredMatches = matches.filter(match => {
    // ONLY use groupId field (Unibet league ID) - STRICT METHOD (same as backend)
    const hasGroupId = !!match.groupId;
    const isAllowed = hasGroupId && isLeagueAllowed(match.groupId);
    
    // #region agent log
    if (matches.indexOf(match) < 3) {
      fetch('http://127.0.0.1:7242/ingest/36e9cd0b-a351-407e-8f20-cf67918d6e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leagueFilter.js:135',message:'filterMatchesByAllowedLeagues - checking match',data:{matchId:match.id,groupId:match.groupId,groupIdType:typeof match.groupId,hasGroupId,isAllowed},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    }
    // #endregion
    
    if (hasGroupId && isAllowed) {
      return true;
    }
    
    return false;
  });

  console.log(`🔍 [NEXT API] League filtering: ${matches.length} total matches → ${filteredMatches.length} allowed matches`);
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/36e9cd0b-a351-407e-8f20-cf67918d6e8e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'leagueFilter.js:150',message:'filterMatchesByAllowedLeagues - result',data:{totalMatches:matches.length,filteredMatches:filteredMatches.length,filteredSample:filteredMatches.slice(0,3).map(m=>({id:m.id,groupId:m.groupId}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  
  return filteredMatches;
}

/**
 * Get statistics about league filtering
 * @returns {Object} - Statistics about the league mapping
 */
export function getLeagueFilterStats() {
  const mapping = loadLeagueMapping();
  return {
    totalAllowedLeagues: mapping.totalLeagues || 0,
    allowedLeagueNames: Array.from(mapping.allowedLeagueNames || []),
    allowedLeagueIds: Array.from(mapping.allowedLeagueIds || [])
  };
}

