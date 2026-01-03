// Next.js API Route - Proxy for Unibet Bet Offers API (handles CORS)
// Node.js runtime required for proxy support
import { NextResponse } from 'next/server';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

const UNIBET_BETOFFERS_API = 'https://oc-offering-api.kambicdn.com/offering/v2018/ubau/betoffer/event';

// Proxy configuration (for 410 fallback)
const PROXY_CONFIG = {
  host: process.env.KAMBI_PROXY_HOST || '104.252.62.178',
  port: process.env.KAMBI_PROXY_PORT || '5549',
  username: process.env.KAMBI_PROXY_USER || 'xzskxfzx',
  password: process.env.KAMBI_PROXY_PASS || 't3xvzuubsk2d'
};

const PROXY_URL = `http://${PROXY_CONFIG.username}:${PROXY_CONFIG.password}@${PROXY_CONFIG.host}:${PROXY_CONFIG.port}`;

const UNIBET_BETOFFERS_HEADERS = {
  'accept': 'application/json, text/javascript, */*; q=0.01',
  'accept-language': 'en-US,en;q=0.9',
  'cache-control': 'no-cache',
  'origin': 'https://www.unibet.com.au',
  'pragma': 'no-cache',
  'priority': 'u=1, i',
  'referer': 'https://www.unibet.com.au/',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
};

// Function to fetch bet offers through proxy (fallback for 410)
async function fetchBetOffersViaProxy(eventId) {
  const startTime = Date.now();
  try {
    console.log(`🔄 [PROXY] [${eventId}] Starting proxy fetch attempt...`);
    
    const url = `${UNIBET_BETOFFERS_API}/${eventId}.json?lang=en_AU&market=AU`;
    
    // Create proxy agent
    const httpsAgent = new HttpsProxyAgent(PROXY_URL);
    
    console.log(`🔄 [PROXY] [${eventId}] Sending request via proxy (timeout: 5s)...`);
    
    // Use axios with proxy (more reliable than fetch for proxy)
    const response = await axios.get(url, {
      headers: UNIBET_BETOFFERS_HEADERS,
      httpsAgent: httpsAgent,
      httpAgent: httpsAgent,
      timeout: 5000, // 5 seconds for proxy
      validateStatus: () => true // Don't throw on non-200
    });
    
    const duration = Date.now() - startTime;
    console.log(`🔍 [PROXY] [${eventId}] Response received:`, {
      status: response.status,
      hasData: !!response.data,
      dataType: typeof response.data,
      dataKeys: response.data ? Object.keys(response.data).slice(0, 3) : [],
      duration: `${duration}ms`
    });
    
    if (response.status === 200 && response.data) {
      const dataSize = JSON.stringify(response.data).length;
      console.log(`✅ [PROXY] [${eventId}] SUCCESS - Status: 200, Data size: ${dataSize} bytes, Duration: ${duration}ms`);
      return response.data;
    }
    
    console.warn(`⚠️ [PROXY] [${eventId}] FAILED - Status: ${response.status}, No valid data returned`);
    throw new Error(`Proxy request returned ${response.status}`);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [PROXY] [${eventId}] ERROR after ${duration}ms:`, {
      message: error.message,
      code: error.code,
      name: error.name,
      isTimeout: error.message?.includes('timeout') || error.code === 'ECONNABORTED'
    });
    return null;
  }
}

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
    
    // ✅ FIX: Validate that eventId is numeric (Unibet API requires numeric IDs)
    const isNumeric = /^\d+$/.test(eventId);
    if (!isNumeric) {
      console.warn(`⚠️ [NEXT API] Invalid eventId format: "${eventId}" (expected numeric ID)`);
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid event ID format',
          message: `Event ID must be numeric. Received: "${eventId}". This appears to be a slug instead of an event ID.`,
          eventId,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }
    
    const url = `${UNIBET_BETOFFERS_API}/${eventId}.json?lang=en_AU&market=AU`;
    
    console.log(`🔍 [DIRECT] [${eventId}] Starting direct fetch request...`);
    
    // Retry logic for network errors (ENOTFOUND, etc.)
    let response;
    let lastError;
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second
    const directFetchStartTime = Date.now();
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 [DIRECT] [${eventId}] Attempt ${attempt}/${maxRetries} - Fetching...`);
        const attemptStartTime = Date.now();
        
        response = await fetch(url, {
          headers: UNIBET_BETOFFERS_HEADERS,
          signal: AbortSignal.timeout(2500) // 2.5 seconds timeout - balanced for real-time updates
        });
        
        const attemptDuration = Date.now() - attemptStartTime;
        console.log(`✅ [DIRECT] [${eventId}] Attempt ${attempt} SUCCESS - Status: ${response.status}, Duration: ${attemptDuration}ms`);
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries && (error.code === 'ENOTFOUND' || error.message?.includes('fetch failed'))) {
          console.warn(`⚠️ [DIRECT] [${eventId}] Attempt ${attempt}/${maxRetries} FAILED - Network error, retrying in ${retryDelay * attempt}ms...`, {
            error: error.message,
            code: error.code
          });
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt)); // Exponential backoff
        } else {
          console.error(`❌ [DIRECT] [${eventId}] Attempt ${attempt} FAILED - Non-retryable error:`, error.message);
          throw error; // Re-throw if not retryable or max retries reached
        }
      }
    }
    
    const directFetchDuration = Date.now() - directFetchStartTime;
    
    if (!response) {
      console.error(`❌ [DIRECT] [${eventId}] All attempts failed after ${directFetchDuration}ms`);
      throw lastError || new Error('Failed to fetch after retries');
    }
    
    console.log(`📊 [DIRECT] [${eventId}] Final response:`, {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      totalDuration: `${directFetchDuration}ms`
    });
    
    // Handle 404 (match finished/not found)
    if (response.status === 404) {
      console.log(`📋 [RESULT] [${eventId}] Match not found (404) - Returning error`);
      return NextResponse.json({
        success: false,
        eventId,
        error: 'Match not found',
        message: 'Match may be finished or no longer available',
        status: 404,
        timestamp: new Date().toISOString()
      });
    }
    
    // ✅ Special handling for 410 (Gone) - try proxy as fallback
    if (response.status === 410) {
      console.warn(`⚠️ [410 HANDLER] [${eventId}] Direct fetch returned 410 - Starting proxy fallback...`);
      
      // Try proxy fallback
      const proxyData = await fetchBetOffersViaProxy(eventId);
      
      console.log(`🔍 [410 HANDLER] [${eventId}] Proxy result check:`, {
        hasData: !!proxyData,
        isNull: proxyData === null,
        isUndefined: proxyData === undefined,
        type: typeof proxyData
      });
      
      if (proxyData) {
        console.log(`✅ [410 HANDLER] [${eventId}] PROXY FALLBACK SUCCESS - Returning data from proxy`);
        return NextResponse.json({
          success: true,
          eventId,
          data: proxyData,
          timestamp: new Date().toISOString(),
          source: 'unibet-proxy-nodejs-fallback'
        }, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate'
          }
        });
      }
      
      // If proxy also failed, return error
      console.error(`❌ [410 HANDLER] [${eventId}] PROXY FALLBACK FAILED - Both direct and proxy failed, returning 410 error`);
      return NextResponse.json({
        success: false,
        eventId,
        error: 'API unavailable',
        message: 'Kambi API returned 410 and proxy fallback also failed',
        status: 410,
        timestamp: new Date().toISOString()
      }, { status: 410 });
    }
    
    if (!response.ok) {
      console.error(`❌ [RESULT] [${eventId}] Response not OK - Status: ${response.status}, Throwing error`);
      throw new Error(`Unibet API returned ${response.status}`);
    }
    
    console.log(`📥 [RESULT] [${eventId}] Direct fetch SUCCESS (Status: ${response.status}) - Parsing JSON...`);
    const data = await response.json();
    
    console.log(`✅ [RESULT] [${eventId}] DIRECT FETCH SUCCESS - Returning data (source: direct)`);
    
    // Return with streaming-friendly response
    return NextResponse.json({
      success: true,
      eventId,
      data: data,
      timestamp: new Date().toISOString(),
      source: 'unibet-proxy-nodejs'
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      }
    });
  } catch (error) {
    const { eventId } = await params;
    console.error(`❌ [ERROR HANDLER] [${eventId}] Exception caught:`, {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack?.split('\n')[0] // First line of stack only
    });
    
    // ✅ If direct fetch failed and we haven't tried proxy yet, try proxy
    const shouldTryProxy = error.message?.includes('410') || 
                          error.message?.includes('aborted') || 
                          error.message?.includes('timeout') ||
                          error.code === 'ECONNABORTED';
    
    if (shouldTryProxy) {
      console.warn(`⚠️ [ERROR HANDLER] [${eventId}] Error suggests proxy might help - Trying proxy fallback...`, {
        reason: error.message?.includes('410') ? '410 error' : 
                error.message?.includes('aborted') ? 'Request aborted' : 
                error.message?.includes('timeout') ? 'Timeout' : 'Unknown'
      });
      
      const proxyData = await fetchBetOffersViaProxy(eventId);
      
      if (proxyData) {
        console.log(`✅ [ERROR HANDLER] [${eventId}] PROXY FALLBACK SUCCESS after error - Returning data from proxy`);
        return NextResponse.json({
          success: true,
          eventId,
          data: proxyData,
          timestamp: new Date().toISOString(),
          source: 'unibet-proxy-nodejs-fallback'
        }, {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate'
          }
        });
      } else {
        console.error(`❌ [ERROR HANDLER] [${eventId}] PROXY FALLBACK FAILED - Both direct and proxy failed`);
      }
    } else {
      console.log(`ℹ️ [ERROR HANDLER] [${eventId}] Error type doesn't warrant proxy fallback`);
    }
    
    console.error(`❌ [ERROR HANDLER] [${eventId}] Returning 500 error to client`);
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

// Ensure Node.js runtime (required for proxy agent)
export const runtime = 'nodejs';

