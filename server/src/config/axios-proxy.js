// server/src/config/axios-proxy.js
// PROXY REMOVED - Using direct axios connection
import axios from 'axios';
import https from 'https';
import http from 'http';

// Create axios instance WITHOUT proxy (direct connection)
const axiosWithProxy = axios.create({
  timeout: 30000,
  httpsAgent: new https.Agent({
    rejectUnauthorized: process.env.NODE_ENV !== 'development',
    keepAlive: true,
    keepAliveMsecs: 60000,
    maxSockets: 10,
    maxFreeSockets: 5,
  }),
  httpAgent: new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 60000,
    maxSockets: 10,
    maxFreeSockets: 5,
  }),
  headers: {
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
  }
});

console.log('✅ Axios configured for direct connection (no proxy)');

export default axiosWithProxy;

