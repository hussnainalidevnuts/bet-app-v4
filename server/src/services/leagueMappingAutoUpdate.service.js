import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { normalizeTeamName, calculateNameSimilarity } from '../unibet-calc/utils/fotmob-helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LeagueMappingAutoUpdate {
    constructor() {
        this.clientCsvPath = path.join(__dirname, '../../../client/league_mapping_clean.csv');
        this.serverCsvPath = path.join(__dirname, '../unibet-calc/league_mapping_clean.csv');
        this.existingMappings = new Map(); // Key: Unibet_ID, Value: mapping object
        this.existingFotmobIds = new Set(); // Track all Fotmob IDs already mapped
        this.newMappings = []; // Store new mappings to add
    }

    /**
     * Load existing mappings from CSV files
     */
    loadExistingMappings() {
        console.log('[LeagueMapping] Loading existing mappings from CSV...');
        
        try {
            // Read server CSV (both should be same, but we'll check server one)
            if (!fs.existsSync(this.serverCsvPath)) {
                console.warn('[LeagueMapping] Server CSV file not found:', this.serverCsvPath);
                return;
            }

            const csvContent = fs.readFileSync(this.serverCsvPath, 'utf8');
            const lines = csvContent.split('\n').slice(1); // Skip header

            this.existingMappings.clear();
            this.existingFotmobIds.clear();

            for (const line of lines) {
                if (!line.trim() || line.startsWith(',')) continue; // Skip empty lines
                
                const [unibetId, unibetName, fotmobId, fotmobName, matchType, country] = 
                    line.split(',').map(s => s.trim().replace(/"/g, ''));

                if (unibetId && fotmobId) {
                    this.existingMappings.set(unibetId, {
                        unibetId,
                        unibetName,
                        fotmobId,
                        fotmobName,
                        matchType,
                        country
                    });
                    // Track Fotmob ID to prevent duplicate mappings
                    this.existingFotmobIds.add(fotmobId);
                }
            }

            console.log(`[LeagueMapping] Loaded ${this.existingMappings.size} existing mappings`);
        } catch (error) {
            console.error('[LeagueMapping] Error loading existing mappings:', error);
        }
    }

    /**
     * Extract league ID and info from Unibet path array
     * Path structure: [Soccer, Country, League] - we need League (not Soccer, not Country)
     */
    extractLeagueFromPath(pathArray) {
        if (!pathArray || !Array.isArray(pathArray) || pathArray.length < 2) {
            return null;
        }

        // Find league (not soccer/football, not country)
        // Usually it's the last entry, but verify it's not "Soccer" or "Football"
        for (let i = pathArray.length - 1; i >= 0; i--) {
            const item = pathArray[i];
            const termKey = (item.termKey || '').toLowerCase();
            const name = (item.name || '').toLowerCase();
            
            // Skip if it's soccer/football
            if (termKey === 'football' || termKey === 'soccer' || 
                name === 'soccer' || name === 'football') {
                continue;
            }
            
            // This should be the league
            return {
                id: item.id,
                name: item.name,
                englishName: item.englishName || item.name,
                termKey: item.termKey
            };
        }

        // Fallback: return second last if exists (usually country is last, league is second last)
        if (pathArray.length >= 2) {
            const item = pathArray[pathArray.length - 2];
            return {
                id: item.id,
                name: item.name,
                englishName: item.englishName || item.name,
                termKey: item.termKey
            };
        }

        return null;
    }

    /**
     * Extract country from Unibet path array
     */
    extractCountryFromPath(pathArray) {
        if (!pathArray || !Array.isArray(pathArray)) return null;
        
        // Country is usually the second entry (after Soccer)
        for (const item of pathArray) {
            const termKey = (item.termKey || '').toLowerCase();
            // Skip soccer/football
            if (termKey === 'football' || termKey === 'soccer') continue;
            // First non-soccer entry is usually country
            return item.name;
        }
        return null;
    }

    /**
     * Fetch Unibet matches for a specific date
     */
    async fetchUnibetMatches(dateStr) {
        console.log(`[LeagueMapping] Fetching Unibet matches for date: ${dateStr}`);
        
        try {
            // Use the Unibet API endpoint
            const url = `https://www.unibet.com.au/sportsbook-feeds/views/filter/football/all/matches?includeParticipants=true&useCombined=true&ncid=${Date.now()}`;
            
            const headers = {
                'accept': '*/*',
                'accept-language': 'en-US,en;q=0.9',
                'referer': 'https://www.unibet.com.au/betting/sports/filter/football/all/matches',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
            };

            const response = await axios.get(url, { headers, timeout: 30000 });
            const data = response.data;

            // Extract matches from the response structure
            // Structure: layout.sections[].widgets[].matches.groups[].subGroups[].events[].event
            const leaguesMap = new Map(); // Group by league

            const extractFromWidgets = (widgets) => {
                if (!Array.isArray(widgets)) return;

                for (const widget of widgets) {
                    if (widget.matches && widget.matches.groups) {
                        extractFromGroups(widget.matches.groups);
                    }
                }
            };

            const extractFromGroups = (groups) => {
                if (!Array.isArray(groups)) return;

                for (const group of groups) {
                    // Check if group has events directly
                    if (group.events && Array.isArray(group.events)) {
                        extractFromEvents(group.events);
                    }

                    // Check subGroups
                    if (group.subGroups && Array.isArray(group.subGroups)) {
                        for (const subGroup of group.subGroups) {
                            if (subGroup.events && Array.isArray(subGroup.events)) {
                                extractFromEvents(subGroup.events);
                            }
                        }
                    }
                }
            };

            const extractFromEvents = (events) => {
                if (!Array.isArray(events)) return;

                for (const eventObj of events) {
                    if (eventObj.event && eventObj.event.path) {
                        const league = this.extractLeagueFromPath(eventObj.event.path);
                        if (league) {
                            const leagueId = String(league.id);
                            
                            if (!leaguesMap.has(leagueId)) {
                                leaguesMap.set(leagueId, {
                                    id: leagueId,
                                    name: league.name,
                                    englishName: league.englishName,
                                    country: this.extractCountryFromPath(eventObj.event.path),
                                    matches: []
                                });
                            }

                            leaguesMap.get(leagueId).matches.push({
                                eventId: eventObj.event.id,
                                homeName: eventObj.event.homeName,
                                awayName: eventObj.event.awayName,
                                start: eventObj.event.start,
                                path: eventObj.event.path
                            });
                        }
                    }
                }
            };

            // Navigate through the response structure
            if (data.layout && data.layout.sections) {
                for (const section of data.layout.sections) {
                    if (section.widgets) {
                        extractFromWidgets(section.widgets);
                    }
                }
            }

            console.log(`[LeagueMapping] Found ${leaguesMap.size} unique leagues in Unibet data`);
            return Array.from(leaguesMap.values());
        } catch (error) {
            console.error('[LeagueMapping] Error fetching Unibet matches:', error.message);
            throw error;
        }
    }

    /**
     * Fetch Fotmob matches for a specific date
     */
    async fetchFotmobMatches(dateStr) {
        console.log(`[LeagueMapping] Fetching Fotmob matches for date: ${dateStr}`);
        
        try {
            const timezone = 'Asia/Karachi';
            const ccode3 = 'PAK';
            const apiUrl = `https://www.fotmob.com/api/data/matches?date=${dateStr}&timezone=${encodeURIComponent(timezone)}&ccode3=${ccode3}`;

            // Get x-mas token (required for authentication)
            let xmasToken = null;
            try {
                console.log(`[LeagueMapping] 🔑 Attempting to fetch x-mas token...`);
                const xmasResponse = await Promise.race([
                    axios.get('http://46.101.91.154:6006/', { timeout: 5000 }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('x-mas token fetch timeout')), 8000))
                ]);
                xmasToken = xmasResponse.data?.['x-mas'];
                if (xmasToken) {
                    console.log(`[LeagueMapping] ✅ Got x-mas token`);
                } else {
                    console.warn(`[LeagueMapping] ⚠️ x-mas token response missing token`);
                }
            } catch (xmasError) {
                console.warn(`[LeagueMapping] ⚠️ Could not get x-mas token (${xmasError.message}), trying without it...`);
            }

            const headers = {
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Referer': 'https://www.fotmob.com/'
            };

            if (xmasToken) {
                headers['x-mas'] = xmasToken;
            }

            const response = await axios.get(apiUrl, { headers, timeout: 30000 });
            const data = response.data;

            if (!data.leagues || !Array.isArray(data.leagues)) {
                throw new Error('Invalid Fotmob response format');
            }

            console.log(`[LeagueMapping] Found ${data.leagues.length} leagues in Fotmob data`);
            return data.leagues;
        } catch (error) {
            console.error('[LeagueMapping] Error fetching Fotmob matches:', error.message);
            throw error;
        }
    }

    /**
     * Compare countries from Unibet (country name) and Fotmob (ccode)
     * Returns true if countries match, false otherwise
     * Handles International leagues (ccode: "INT") specially
     */
    compareCountries(unibetCountry, fotmobCcode) {
        // If both are missing/empty, consider them as match (unknown countries)
        if (!unibetCountry && !fotmobCcode) return true;
        if (!unibetCountry || !fotmobCcode) return false;
        
        // Normalize both for comparison
        const unibetCountryNorm = (unibetCountry || '').toLowerCase().trim();
        const fotmobCcodeNorm = (fotmobCcode || '').toUpperCase().trim();
        
        // International leagues (Fotmob uses "INT" for international tournaments)
        // Unibet might use "International" or similar
        if (fotmobCcodeNorm === 'INT' || fotmobCcodeNorm === 'INTERNATIONAL') {
            const internationalKeywords = ['international', 'int', 'world', 'global'];
            return internationalKeywords.some(keyword => unibetCountryNorm.includes(keyword));
        }
        
        // Create a mapping from common country names to ISO codes
        // This is based on actual responses, not hardcoded
        const countryNameToCode = {
            'israel': 'ISR',
            'oman': 'OMN',
            'qatar': 'QAT',
            'saudi arabia': 'SAU',
            'egypt': 'EGY',
            'turkey': 'TUR',
            'england': 'ENG',
            'spain': 'ESP',
            'france': 'FRA',
            'germany': 'GER',
            'italy': 'ITA',
            'netherlands': 'NED',
            'portugal': 'POR',
            'brazil': 'BRA',
            'argentina': 'ARG',
            'mexico': 'MEX',
            'usa': 'USA',
            'united states': 'USA',
            'algeria': 'DZA',
            'tunisia': 'TUN',
            'morocco': 'MAR',
            'jordan': 'JOR',
            'iran': 'IRN',
            'uae': 'ARE',
            'united arab emirates': 'ARE'
        };
        
        // Check if Unibet country name maps to Fotmob code
        const expectedCode = countryNameToCode[unibetCountryNorm];
        if (expectedCode && expectedCode === fotmobCcodeNorm) {
            return true;
        }
        
        // Fallback: Check if country name contains the code or vice versa
        // This handles cases where country name might be "Israel" and code is "ISR"
        const countryNameFirst3 = unibetCountryNorm.substring(0, 3).toUpperCase();
        if (countryNameFirst3 === fotmobCcodeNorm) {
            return true;
        }
        
        // If no match found, return false (strict matching)
        return false;
    }

    /**
     * Compare two team names using existing similarity logic
     */
    compareTeamNames(name1, name2) {
        const similarity = calculateNameSimilarity(name1, name2);
        return similarity >= 0.7; // Threshold for match
    }

    /**
     * Compare both teams together (home and away)
     */
    compareTeams(unibetHome, unibetAway, fotmobHome, fotmobAway) {
        // Normal case: home matches home, away matches away
        const normalMatch = 
            this.compareTeamNames(unibetHome, fotmobHome) &&
            this.compareTeamNames(unibetAway, fotmobAway);

        // Swapped case: home matches away, away matches home
        const swappedMatch = 
            this.compareTeamNames(unibetHome, fotmobAway) &&
            this.compareTeamNames(unibetAway, fotmobHome);

        return normalMatch || swappedMatch;
    }

    /**
     * Compare match times (within tolerance)
     */
    compareTime(unibetTime, fotmobTime, toleranceMinutes = 30) {
        try {
            const unibetDate = new Date(unibetTime);
            const fotmobDate = new Date(fotmobTime);

            if (isNaN(unibetDate.getTime()) || isNaN(fotmobDate.getTime())) {
                return false;
            }

            const diffMinutes = Math.abs((unibetDate.getTime() - fotmobDate.getTime()) / (1000 * 60));
            return diffMinutes <= toleranceMinutes;
        } catch (error) {
            return false;
        }
    }

    /**
     * Find matching Fotmob league for Unibet league
     */
    findMatchingFotmobLeague(unibetLeague, fotmobLeagues) {
        console.log(`[LeagueMapping] Finding match for Unibet league: ${unibetLeague.name} (ID: ${unibetLeague.id})`);

        // Simple case: Exact country + league name match
        for (const fotmobLeague of fotmobLeagues) {
            // Check country match first (from actual API responses)
            const unibetCountry = unibetLeague.country || '';
            const fotmobCcode = fotmobLeague.ccode || '';
            
            // Skip if countries don't match (unless both are international/empty)
            if (!this.compareCountries(unibetCountry, fotmobCcode)) {
                continue; // Skip this Fotmob league - different country
            }
            
            // Use parentLeagueName if it's a group, otherwise use name
            const fotmobName = fotmobLeague.isGroup && fotmobLeague.parentLeagueName 
                ? fotmobLeague.parentLeagueName 
                : (fotmobLeague.name || fotmobLeague.parentLeagueName || '');
            const unibetName = unibetLeague.englishName || unibetLeague.name || '';
            
            // Normalize names for comparison
            const fotmobNameNorm = normalizeTeamName(fotmobName);
            const unibetNameNorm = normalizeTeamName(unibetName);

            // Check if names match exactly (after normalization)
            // Only consider it exact match if names are exactly equal after normalization
            // Don't use includes() as it causes false positives (e.g., "Cup" in "Africa Cup of Nations")
            if (fotmobNameNorm === unibetNameNorm) {
                const fotmobId = String(fotmobLeague.primaryId || fotmobLeague.id);
                console.log(`[LeagueMapping] ✅ Exact name match found: ${fotmobName} (Fotmob ID: ${fotmobId}, Country: ${fotmobCcode})`);
                return {
                    id: fotmobLeague.primaryId || fotmobLeague.id,
                    name: fotmobName, // Use parent league name for groups
                    exactMatch: true
                };
            }
        }

        // Complex case: Match by teams + time
        console.log(`[LeagueMapping] No exact match found, trying team + time comparison...`);
        
        let bestMatch = null;
        let bestMatchScore = 0;

        for (const fotmobLeague of fotmobLeagues) {
            // Check country match first (from actual API responses)
            const unibetCountry = unibetLeague.country || '';
            const fotmobCcode = fotmobLeague.ccode || '';
            
            // Skip if countries don't match (unless both are international/empty)
            if (!this.compareCountries(unibetCountry, fotmobCcode)) {
                continue; // Skip this Fotmob league - different country
            }
            
            if (!fotmobLeague.matches || !Array.isArray(fotmobLeague.matches)) continue;

            let matchCount = 0;
            let totalScore = 0;

            for (const fotmobMatch of fotmobLeague.matches) {
                for (const unibetMatch of unibetLeague.matches) {
                    // Compare teams
                    const teamsMatch = this.compareTeams(
                        unibetMatch.homeName,
                        unibetMatch.awayName,
                        fotmobMatch.home?.name || fotmobMatch.home?.longName,
                        fotmobMatch.away?.name || fotmobMatch.away?.longName
                    );

                    if (teamsMatch) {
                        // Compare time
                        const fotmobTime = fotmobMatch.status?.utcTime || fotmobMatch.time;
                        const timeMatch = this.compareTime(unibetMatch.start, fotmobTime);

                        if (timeMatch) {
                            matchCount++;
                            totalScore += 1.0; // Perfect match
                        } else if (teamsMatch) {
                            matchCount++;
                            totalScore += 0.5; // Teams match but time doesn't
                        }
                    }
                }
            }

            // Calculate match score (percentage of matches that matched)
            if (matchCount > 0) {
                const score = totalScore / Math.max(unibetLeague.matches.length, fotmobLeague.matches.length);
                if (score > bestMatchScore && score >= 0.5) { // At least 50% matches
                    bestMatchScore = score;
                    bestMatch = {
                        id: fotmobLeague.primaryId || fotmobLeague.id,
                        name: fotmobLeague.isGroup && fotmobLeague.parentLeagueName 
                            ? fotmobLeague.parentLeagueName 
                            : (fotmobLeague.name || fotmobLeague.parentLeagueName || ''),
                        exactMatch: false,
                        matchScore: score,
                        matchCount
                    };
                }
            }
        }

        if (bestMatch) {
            console.log(`[LeagueMapping] ✅ Team+time match found: ${bestMatch.name} (Fotmob ID: ${bestMatch.id}, Score: ${bestMatch.matchScore.toFixed(2)})`);
            return bestMatch;
        }

        console.log(`[LeagueMapping] ❌ No match found for Unibet league: ${unibetLeague.name}`);
        return null;
    }

    /**
     * Add new mapping to CSV files
     */
    async addMappingToCsv(mapping) {
        const matchType = mapping.exactMatch ? 'Exact Match' : 'Different Name';
        const row = [
            mapping.unibetId,
            `"${mapping.unibetName}"`,
            mapping.fotmobId,
            `"${mapping.fotmobName}"`,
            matchType,
            mapping.country || ''
        ].join(',');

        try {
            // Ensure file ends with newline before appending
            const ensureNewline = (filePath) => {
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    // Remove trailing empty lines and ensure single newline at end
                    const trimmed = content.replace(/\n+$/, '');
                    if (trimmed && !trimmed.endsWith('\n')) {
                        fs.writeFileSync(filePath, trimmed + '\n', 'utf8');
                    } else if (trimmed) {
                        // Content exists and already ends with newline, just ensure single newline
                        fs.writeFileSync(filePath, trimmed + '\n', 'utf8');
                    }
                }
            };

            // Append to both CSV files
            if (fs.existsSync(this.clientCsvPath)) {
                ensureNewline(this.clientCsvPath);
                fs.appendFileSync(this.clientCsvPath, row + '\n');
                console.log(`[LeagueMapping] ✅ Added to client CSV: ${mapping.unibetName} → ${mapping.fotmobName}`);
            } else {
                console.warn(`[LeagueMapping] ⚠️ Client CSV not found: ${this.clientCsvPath}`);
            }

            if (fs.existsSync(this.serverCsvPath)) {
                ensureNewline(this.serverCsvPath);
                fs.appendFileSync(this.serverCsvPath, row + '\n');
                console.log(`[LeagueMapping] ✅ Added to server CSV: ${mapping.unibetName} → ${mapping.fotmobName}`);
            } else {
                console.warn(`[LeagueMapping] ⚠️ Server CSV not found: ${this.serverCsvPath}`);
            }

            // Also add to existing mappings cache
            this.existingMappings.set(mapping.unibetId, {
                unibetId: mapping.unibetId,
                unibetName: mapping.unibetName,
                fotmobId: mapping.fotmobId,
                fotmobName: mapping.fotmobName,
                matchType,
                country: mapping.country || ''
            });
            // Track Fotmob ID
            this.existingFotmobIds.add(mapping.fotmobId);

            return true;
        } catch (error) {
            console.error(`[LeagueMapping] ❌ Error adding mapping to CSV:`, error);
            return false;
        }
    }

    /**
     * Generate leagueUtils.js file from CSV mappings
     */
    async generateLeagueUtils() {
        console.log('[LeagueMapping] 🔄 Generating leagueUtils.js from CSV...');
        
        try {
            // Read CSV file
            if (!fs.existsSync(this.clientCsvPath)) {
                console.warn('[LeagueMapping] ⚠️ Client CSV not found, cannot generate leagueUtils.js');
                return false;
            }

            const csvContent = fs.readFileSync(this.clientCsvPath, 'utf8');
            const lines = csvContent.split('\n').slice(1); // Skip header

            const mappings = [];
            
            for (const line of lines) {
                if (!line.trim() || line.startsWith(',')) continue;
                
                const [unibetId, unibetName, fotmobId, fotmobName, matchType, country] = 
                    line.split(',').map(s => s.trim().replace(/"/g, ''));

                if (unibetId && fotmobId) {
                    mappings.push({
                        unibetId,
                        unibetName: unibetName || 'Unknown',
                        fotmobId,
                        fotmobName: fotmobName || 'Unknown',
                        country: country || ''
                    });
                }
            }

            // Sort by league name for better organization
            mappings.sort((a, b) => {
                const nameA = (a.unibetName || '').toLowerCase();
                const nameB = (b.unibetName || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });

            // Generate the file content
            let fileContent = `// Simple utility to get Fotmob logo URL from Unibet league ID
// Based on league_mapping_clean.csv
// Auto-generated - DO NOT EDIT MANUALLY (will be overwritten by league mapping job)

const UNIBET_TO_FOTMOB_MAPPING = {
`;

            // Add mappings with comments
            for (const mapping of mappings) {
                const comment = mapping.country 
                    ? `${mapping.unibetName} (${mapping.country})`
                    : mapping.unibetName;
                fileContent += `  '${mapping.unibetId}': '${mapping.fotmobId}', // ${comment}\n`;
            }

            fileContent += `};

export const getFotmobLogoByUnibetId = (unibetId) => {
  if (!unibetId) {
    return null;
  }
  
  const fotmobId = UNIBET_TO_FOTMOB_MAPPING[String(unibetId)];
  
  if (!fotmobId) {
    return null;
  }
  
  const url = \`https://images.fotmob.com/image_resources/logo/leaguelogo/\${fotmobId}.png\`;
  return url;
};
`;

            // Write to client folder
            const clientLeagueUtilsPath = path.join(__dirname, '../../../client/lib/leagueUtils.js');
            fs.writeFileSync(clientLeagueUtilsPath, fileContent, 'utf8');
            
            console.log(`[LeagueMapping] ✅ Generated leagueUtils.js with ${mappings.length} mappings`);
            console.log(`[LeagueMapping] 📁 Saved to: ${clientLeagueUtilsPath}`);
            
            return true;
        } catch (error) {
            console.error('[LeagueMapping] ❌ Error generating leagueUtils.js:', error);
            return false;
        }
    }

    /**
     * Main execution method
     */
    async execute() {
        const startTime = Date.now();
        console.log('[LeagueMapping] ========================================');
        console.log('[LeagueMapping] 🚀 Starting League Mapping Auto-Update');
        console.log('[LeagueMapping] ========================================');
        console.log(`[LeagueMapping] ⏰ Start time: ${new Date().toISOString()}`);

        try {
            // 1. Load existing mappings
            this.loadExistingMappings();

            // 2. Get today's date
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
            console.log(`[LeagueMapping] Processing date: ${dateStr}`);

            // 3. Fetch Unibet matches
            const unibetLeagues = await this.fetchUnibetMatches(dateStr);
            console.log(`[LeagueMapping] Found ${unibetLeagues.length} Unibet leagues`);

            // 4. Fetch Fotmob matches
            const fotmobLeagues = await this.fetchFotmobMatches(dateStr);
            console.log(`[LeagueMapping] Found ${fotmobLeagues.length} Fotmob leagues`);

            // 5. Process each Unibet league
            let newMappingsCount = 0;
            let skippedCount = 0;
            let notFoundCount = 0;

            for (const unibetLeague of unibetLeagues) {
                // Skip Esports leagues
                const leagueNameLower = (unibetLeague.name || '').toLowerCase();
                if (leagueNameLower.includes('esports') || leagueNameLower.includes('esport')) {
                    console.log(`[LeagueMapping] ⏭️ Skipping Esports league: ${unibetLeague.name}`);
                    skippedCount++;
                    continue;
                }

                // Skip if already in CSV (by Unibet ID)
                if (this.existingMappings.has(unibetLeague.id)) {
                    console.log(`[LeagueMapping] ⚠️ Skipping ${unibetLeague.name} - Unibet ID ${unibetLeague.id} already exists in CSV`);
                    skippedCount++;
                    continue;
                }

                // Skip if no matches (can't compare)
                if (!unibetLeague.matches || unibetLeague.matches.length === 0) {
                    console.log(`[LeagueMapping] ⚠️ Skipping ${unibetLeague.name} - no matches`);
                    skippedCount++;
                    continue;
                }

                // Find matching Fotmob league
                const fotmobLeague = this.findMatchingFotmobLeague(unibetLeague, fotmobLeagues);

                if (fotmobLeague) {
                    const fotmobId = String(fotmobLeague.id);
                    
                    // Check if this Fotmob ID is already mapped to any Unibet league
                    if (this.existingFotmobIds.has(fotmobId)) {
                        console.log(`[LeagueMapping] ⚠️ Skipping ${unibetLeague.name} - Fotmob ID ${fotmobId} already mapped to another league`);
                        skippedCount++;
                        continue;
                    }
                    
                    // Double check: Verify the combination doesn't exist
                    // (This should already be covered by Unibet ID check, but extra safety)
                    const existingMapping = this.existingMappings.get(unibetLeague.id);
                    if (existingMapping && existingMapping.fotmobId === fotmobId) {
                        console.log(`[LeagueMapping] ⚠️ Skipping ${unibetLeague.name} - Combination (Unibet ID: ${unibetLeague.id}, Fotmob ID: ${fotmobId}) already exists`);
                        skippedCount++;
                        continue;
                    }
                    
                    // Add to CSV
                    const success = await this.addMappingToCsv({
                        unibetId: unibetLeague.id,
                        unibetName: unibetLeague.englishName || unibetLeague.name, // Use englishName
                        fotmobId: fotmobId,
                        fotmobName: fotmobLeague.name, // Already using parentLeagueName for groups
                        exactMatch: fotmobLeague.exactMatch,
                        country: unibetLeague.country || ''
                    });

                    if (success) {
                        newMappingsCount++;
                        // Track the new Fotmob ID
                        this.existingFotmobIds.add(fotmobId);
                    }
                } else {
                    notFoundCount++;
                }
            }

            console.log('[LeagueMapping] ========================================');
            console.log('[LeagueMapping] ✅ League Mapping Auto-Update Completed');
            console.log('[LeagueMapping] ========================================');
            console.log(`[LeagueMapping] Summary:`);
            console.log(`  - New mappings added: ${newMappingsCount}`);
            console.log(`  - Already exists (skipped): ${skippedCount}`);
            console.log(`  - No match found: ${notFoundCount}`);
            console.log('[LeagueMapping] ========================================');
            
            // Generate leagueUtils.js from updated CSV
            await this.generateLeagueUtils();
            
            console.log('[LeagueMapping] ========================================');
            console.log(''); // Empty line for better readability

            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);
            
            const result = {
                success: true,
                newMappings: newMappingsCount,
                skipped: skippedCount,
                notFound: notFoundCount,
                duration: `${duration}s`
            };
            
            console.log(`[LeagueMapping] ⏰ Total execution time: ${duration} seconds`);
            console.log(`[LeagueMapping] ⏰ End time: ${new Date().toISOString()}`);
            
            // Ensure we return immediately without any blocking operations
            return result;
        } catch (error) {
            const endTime = Date.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);
            
            console.error('[LeagueMapping] ========================================');
            console.error('[LeagueMapping] ❌ League Mapping Auto-Update Failed');
            console.error('[LeagueMapping] ========================================');
            console.error(`[LeagueMapping] ⏰ Failed after: ${duration} seconds`);
            console.error(`[LeagueMapping] ⏰ Error time: ${new Date().toISOString()}`);
            console.error('[LeagueMapping] Error:', error.message || error);
            console.error('[LeagueMapping] Stack:', error.stack);
            throw error;
        }
    }
}

export default LeagueMappingAutoUpdate;

