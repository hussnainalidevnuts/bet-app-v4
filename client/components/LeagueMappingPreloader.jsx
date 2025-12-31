'use client';

import { useEffect } from 'react';
import { preloadLeagueMapping } from '@/lib/leagueUtils';

/**
 * Component to preload league mapping on app initialization
 * This ensures icons are available immediately without waiting for lazy load
 */
export default function LeagueMappingPreloader() {
  useEffect(() => {
    // Preload league mapping when app initializes
    preloadLeagueMapping();
  }, []);

  // This component doesn't render anything
  return null;
}

