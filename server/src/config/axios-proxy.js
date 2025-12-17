// server/src/config/axios-proxy.js
import axios from 'axios';
import https from 'https';
import http from 'http';

const getProxyConfig = () => {
  return process.env.HTTPS_PROXY || 
         process.env.https_proxy || 
         process.env.HTTP_PROXY || 
         process.env.http_proxy;
};

const proxyUrl = getProxyConfig();

// Parse proxy URL to extract components
let proxyConfig = false;
if (proxyUrl) {
  try {
    const url = new URL(proxyUrl);
    proxyConfig = {
      protocol: url.protocol.replace(':', ''),
      host: url.hostname,
      port: parseInt(url.port) || (url.protocol.includes('https') ? 443 : 80),
      auth: url.username && url.password ? {
        username: url.username,
        password: url.password
      } : undefined
    };
    console.log(`✅ Axios proxy configured: ${proxyConfig.protocol}://${proxyConfig.host}:${proxyConfig.port}`);
  } catch (error) {
    console.error('❌ Error parsing proxy URL:', error.message);
    proxyConfig = false;
  }
} else {
  console.log('⚠️ No proxy configured for axios - using direct connection');
}

// Create axios instance with proxy configuration
const axiosWithProxy = axios.create({
  timeout: 30000,
  proxy: proxyConfig,
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

// Request interceptor for logging
axiosWithProxy.interceptors.request.use(
  (config) => {
    if (proxyConfig) {
      console.log(`🌐 [PROXY] Request through proxy: ${config.method?.toUpperCase()} ${config.url || config.baseURL}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
axiosWithProxy.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
      console.error(`❌ [PROXY] Connection error: ${error.code} - ${error.message}`);
      if (error.config?.url) {
        console.error(`❌ [PROXY] Failed URL: ${error.config.url}`);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosWithProxy;

