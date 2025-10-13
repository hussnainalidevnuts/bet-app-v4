import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Parse SportsMonks time with improved timezone handling
 * @param {string} dateTime - Date time string from SportsMonks API
 * @returns {Date|null} Parsed date or null if invalid
 */
export const parseSportsMonksTime = (dateTime) => {
  if (!dateTime) return null;
  
  try {
    let parsedDate;
    
    if (typeof dateTime === 'string') {
      // Handle different formats
      if (dateTime.includes('T')) {
        // ISO format with timezone
        parsedDate = new Date(dateTime);
      } else if (dateTime.includes('Z') || dateTime.includes('+')) {
        // Already has timezone info
        parsedDate = new Date(dateTime);
      } else {
        // Format: "2025-07-16 09:00:00" -> treat as UTC
        parsedDate = new Date(dateTime + ' UTC');
      }
    } else if (dateTime instanceof Date) {
      parsedDate = dateTime;
    } else {
      return null;
    }
    
    // Validate the date
    if (isNaN(parsedDate.getTime())) {
      console.error(`[parseSportsMonksTime] Invalid date created from: ${dateTime}`);
      return null;
    }
    
    return parsedDate;
  } catch (error) {
    console.error(`[parseSportsMonksTime] Error parsing date: ${dateTime}`, error);
    return null;
  }
};

/**
 * Calculate server time offset for better synchronization
 * @param {Object} timing - Timing object from backend
 * @returns {number} Time offset in milliseconds
 */
export const calculateServerTimeOffset = (timing) => {
  if (!timing || !timing.cacheTime) {
    return 0;
  }
  
  const serverCacheTime = timing.cacheTime;
  const clientTime = Date.now();
  const offset = clientTime - serverCacheTime;
  
  // Log for debugging
  console.log('[calculateServerTimeOffset]', {
    serverCacheTime: new Date(serverCacheTime).toISOString(),
    clientTime: new Date(clientTime).toISOString(),
    offset: offset,
    offsetSeconds: Math.round(offset / 1000)
  });
  
  return offset;
};

/**
 * Get corrected current time using server offset
 * @param {number} serverOffset - Server time offset in milliseconds
 * @returns {Date} Corrected current time
 */
export const getCorrectedCurrentTime = (serverOffset = 0) => {
  const now = new Date();
  const correctedTime = new Date(now.getTime() - serverOffset);
  return correctedTime;
};

/**
 * Format a date/time string to the user's local timezone in 12-hour format
 * @param {string|Date} dateTime - ISO string or Date object
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date/time string
 */
export const formatToLocalTime = (dateTime, options = {}) => {
  if (!dateTime) return 'TBD';
  
  try {
    const date = parseSportsMonksTime(dateTime);
    
    // Check if date is valid
    if (!date || isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    const {
      showDate = true,
      showTime = true,
      showYear = false,
      showSeconds = false,
      format = 'default'
    } = options;

    // Handle different format types
    switch (format) {
      case 'timeOnly':
        return date.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true,
          ...(showSeconds && { second: '2-digit' })
        });
      
      case 'dateOnly':
        return date.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          ...(showYear && { year: 'numeric' })
        });
      
      case 'short':
        return date.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short'
        });
      
      case 'full':
        return date.toLocaleDateString('en-US', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
      
      case 'relative':
        return getRelativeTime(date);
      
      default:
        // Default format: "Today 2:30 PM" or "Tomorrow 2:30 PM" or "15 Dec 2:30 PM"
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
        
        let dateStr = '';
        let timeStr = '';
        
        if (showDate) {
          if (isToday) {
            dateStr = 'Today';
          } else if (isTomorrow) {
            dateStr = 'Tomorrow';
          } else {
            dateStr = date.toLocaleDateString('en-US', {
              day: 'numeric',
              month: 'short',
              ...(showYear && { year: 'numeric' })
            });
          }
        }
        
        if (showTime) {
          timeStr = date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true,
            ...(showSeconds && { second: '2-digit' })
          });
        }
        
        return [dateStr, timeStr].filter(Boolean).join(' ');
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Get relative time string (e.g., "in 2 hours", "2 hours ago")
 * @param {Date} date - Date to compare
 * @returns {string} Relative time string
 */
const getRelativeTime = (date) => {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffMs < 0) {
    // Past time
    if (Math.abs(diffHours) >= 1) {
      return `${Math.abs(diffHours)} hour${Math.abs(diffHours) !== 1 ? 's' : ''} ago`;
    } else {
      return `${Math.abs(diffMinutes)} minute${Math.abs(diffMinutes) !== 1 ? 's' : ''} ago`;
    }
  } else {
    // Future time
    if (diffHours >= 1) {
      return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    } else {
      return `in ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
    }
  }
};

/**
 * Format match time for display in match cards (12-hour format)
 * @param {string|Date} dateTime - Match start time
 * @returns {Object} Object with date and time strings
 */
export const formatMatchTime = (dateTime) => {
  if (!dateTime) return { date: 'TBD', time: '', isToday: false, isTomorrow: false };
  
  try {
    const date = parseSportsMonksTime(dateTime);
    if (!date || isNaN(date.getTime())) {
      return { date: 'Invalid Date', time: '', isToday: false, isTomorrow: false };
    }
    
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
    
    let dateStr = '';
    if (isToday) {
      dateStr = 'Today';
    } else if (isTomorrow) {
      dateStr = 'Tomorrow';
    } else {
      dateStr = date.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short'
      });
    }
    
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    return {
      date: dateStr,
      time: timeStr,
      isToday,
      isTomorrow
    };
  } catch (error) {
    return { date: 'Invalid Date', time: '', isToday: false, isTomorrow: false };
  }
};

/**
 * Get time until match starts
 * @param {string|Date} dateTime - Match start time
 * @returns {Object} Object with hours, minutes, seconds until match
 */
export const getTimeUntilMatch = (dateTime) => {
  if (!dateTime) return { hours: 0, minutes: 0, seconds: 0 };
  
  try {
    const matchDate = parseSportsMonksTime(dateTime);
    if (!matchDate || isNaN(matchDate.getTime())) {
      return { hours: 0, minutes: 0, seconds: 0 };
    }
    
    const now = new Date();
    const diffMs = matchDate.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return { hours: 0, minutes: 0, seconds: 0 };
    }
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    return { hours, minutes, seconds };
  } catch (error) {
    return { hours: 0, minutes: 0, seconds: 0 };
  }
};

/**
 * Check if a match is happening today
 * @param {string|Date} dateTime - Match start time
 * @returns {boolean} True if match is today
 */
export const isMatchToday = (dateTime) => {
  if (!dateTime) return false;
  
  try {
    const matchDate = parseSportsMonksTime(dateTime);
    if (!matchDate || isNaN(matchDate.getTime())) {
      return false;
    }
    
    const today = new Date();
    return matchDate.toDateString() === today.toDateString();
  } catch (error) {
    return false;
  }
};

/**
 * Check if a match is happening tomorrow
 * @param {string|Date} dateTime - Match start time
 * @returns {boolean} True if match is tomorrow
 */
export const isMatchTomorrow = (dateTime) => {
  if (!dateTime) return false;
  
  try {
    const matchDate = parseSportsMonksTime(dateTime);
    if (!matchDate || isNaN(matchDate.getTime())) {
      return false;
    }
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return matchDate.toDateString() === tomorrow.toDateString();
  } catch (error) {
    return false;
  }
};

/**
 * Get user's timezone
 * @returns {string} User's timezone (e.g., "America/New_York")
 */
export const getUserTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Convert UTC time to user's local timezone
 * @param {string|Date} utcTime - UTC time string or Date
 * @returns {Date} Date in user's local timezone
 */
export const convertUTCToLocal = (utcTime) => {
  if (!utcTime) return null;
  
  try {
    const date = parseSportsMonksTime(utcTime);
    if (!date || isNaN(date.getTime())) {
      return null;
    }
    
    return date;
  } catch (error) {
    return null;
  }
};

/**
 * Debug utility to verify timezone conversion
 * @param {string|Date} dateTime - Date to debug
 * @returns {Object} Debug information
 */
export const debugTimezone = (dateTime) => {
  if (!dateTime) return { error: 'No date provided' };
  
  try {
    const parsedDate = parseSportsMonksTime(dateTime);
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      return { error: 'Invalid date format' };
    }
    
    const now = new Date();
    
    return {
      original: dateTime,
      parsed: parsedDate.toISOString(),
      localTime: parsedDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short'
      }),
      userTimezone: getUserTimezone(),
      isToday: parsedDate.toDateString() === now.toDateString(),
      isTomorrow: parsedDate.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString(),
      formatted: formatToLocalTime(dateTime, { format: 'default' })
    };
  } catch (error) {
    return { error: error.message };
  }
};

/**
 * Get countdown to kickoff (days, hours, minutes, seconds) from a match object using starting_at
 * @param {Object} match - Match object with starting_at field
 * @returns {Object} { days, hours, minutes, seconds } until kickoff, or zeros if started or invalid
 */
export const getCountdownToKickoff = (match) => {
  if (!match) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  
  // Try different field names for match start time
  const startTime = match.starting_at || match.start || match.kickoff || match.date;
  if (!startTime) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  
  let kickoff;
  try {
    if (startTime.includes('T')) {
      kickoff = new Date(startTime.endsWith('Z') ? startTime : startTime + 'Z');
    } else {
      kickoff = new Date(startTime.replace(' ', 'T') + 'Z');
    }
  } catch (error) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  
  const now = new Date();
  let diff = Math.max(0, kickoff.getTime() - now.getTime());
  
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  diff -= days * 1000 * 60 * 60 * 24;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  diff -= hours * 1000 * 60 * 60;
  const minutes = Math.floor(diff / (1000 * 60));
  diff -= minutes * 1000 * 60;
  const seconds = Math.floor(diff / 1000);
  
  return { days, hours, minutes, seconds };
};

/**
 * Formats bet label for consistent display across singles and combination bets
 * @param {Object} bet - The bet object containing selection, label, name, marketDescription, etc.
 * @returns {string} - Formatted bet label
 */
export const getBetLabel = (bet) => {
    // Determine the badge value (handicap, total, threshold, etc.)
    const badgeValue = bet.handicapValue || bet.name || bet.total || bet.threshold || null;

    // For 1x2 markets, prioritize the label field
    const is1x2Market = (bet.marketDescription && bet.marketDescription.toLowerCase().includes('full time result')) || bet.type === '1x2';
    
    if (is1x2Market) {
        if (bet.label) {
            return bet.label; // Return "Home", "Draw", "Away"
        }
    }

    // Player market: show 'Market Name - Player Name (Badge)'
    if (bet.marketDescription && bet.name && bet.marketDescription.toLowerCase().includes('player')) {
        return `${bet.marketDescription} - ${bet.name}${badgeValue ? ` (${badgeValue})` : ''}`;
    }
    // Handicap/Alternative Handicap: show 'Market Name - Team Name/Label (Badge)'
    if (
        bet.marketDescription &&
        (bet.marketDescription.toLowerCase().includes('handicap') || bet.marketDescription.toLowerCase().includes('alternative')) &&
        bet.label
    ) {
        if ((bet.label === '1' || bet.label === '2') && bet.name) {
            return `${bet.marketDescription} - ${bet.name}${badgeValue ? ` (${badgeValue})` : ''}`;
        }
        return `${bet.marketDescription} - ${bet.label}${badgeValue ? ` (${badgeValue})` : ''}`;
    }
    // Over/Under and other markets with badge value
    if (bet.marketDescription && badgeValue) {
        if ((bet.label === '1' || bet.label === '2') && bet.name) {
            return `${bet.marketDescription} - ${bet.name} (${badgeValue})`;
        }
        return `${bet.marketDescription} - ${bet.selection} (${badgeValue})`;
    }
    // Fallbacks
    if (bet.marketDescription) {
        if ((bet.label === '1' || bet.label === '2') && bet.name) {
            return `${bet.marketDescription} - ${bet.name}`;
        }
        return `${bet.marketDescription} - ${bet.selection}`;
    }
    if ((bet.label === '1' || bet.label === '2') && bet.name) {
        return bet.name;
    }
    return bet.selection;
};
