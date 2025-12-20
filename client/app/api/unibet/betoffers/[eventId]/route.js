// Next.js API Route - Proxy for Unibet Bet Offers API (handles CORS)
import { NextResponse } from 'next/server';

const UNIBET_BETOFFERS_API = 'https://oc-offering-api.kambicdn.com/offering/v2018/ubau/betoffer/event';

export async function GET(request, { params }) {
  try {
    // ✅ FIX: Await params in Next.js 15+ (params is now a Promise)
    const { eventId } = await params;
    
    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }
    
    const url = `${UNIBET_BETOFFERS_API}/${eventId}.json?lang=en_AU&market=AU`;
    
    console.log(`🔍 [NEXT API] Proxying Unibet bet offers request for event: ${eventId}`);
    
    // Retry logic for network errors (ENOTFOUND, etc.)
    let response;
    let lastError;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await fetch(url, {
          headers: {
            'accept': 'application/json, text/javascript, */*; q=0.01',
            'accept-language': 'en-US,en;q=0.9',
            'cache-control': 'no-cache',
            'origin': 'https://www.unibet.com.au',
            'pragma': 'no-cache',
            'priority': 'u=1, i',
            'referer': 'https://www.unibet.com.au/',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
          }
        });
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries && (error.code === 'ENOTFOUND' || error.message?.includes('fetch failed'))) {
          console.warn(`⚠️ [NEXT API] Network error (attempt ${attempt}/${maxRetries}), retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt)); // Exponential backoff
        } else {
          throw error; // Re-throw if not retryable or max retries reached
        }
      }
    }
    
    if (!response) {
      throw lastError || new Error('Failed to fetch after retries');
    }
    
    // Handle 404 (match finished/not found)
    if (response.status === 404) {
      return NextResponse.json({
        success: false,
        eventId,
        error: 'Match not found',
        message: 'Match may be finished or no longer available',
        status: 404,
        timestamp: new Date().toISOString()
      });
    }
    
    if (!response.ok) {
      throw new Error(`Unibet API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log(`✅ [NEXT API] Successfully proxied Unibet bet offers for event: ${eventId}`);
    
    return NextResponse.json({
      success: true,
      eventId,
      data: data,
      timestamp: new Date().toISOString(),
      source: 'unibet-proxy-nextjs'
    });
  } catch (error) {
    console.error(`❌ [NEXT API] Error proxying Unibet bet offers:`, error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch bet offers',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

