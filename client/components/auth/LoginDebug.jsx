'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login, selectAuth } from '@/lib/features/auth/authSlice';

export default function LoginDebug() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const dispatch = useDispatch();
  const auth = useSelector(selectAuth);

  const handleLogin = async (e) => {
    e.preventDefault();
    setDebugInfo('');

    try {
      console.log('🔍 Starting login debug...');
      console.log('📧 Email:', email);
      console.log('🔐 Password length:', password.length);
      
      // Check localStorage before login
      const existingToken = localStorage.getItem('accessToken');
      console.log('🔍 Existing token in localStorage:', !!existingToken);
      
      // Check environment variables
      console.log('🌐 NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
      console.log('🌍 NODE_ENV:', process.env.NODE_ENV);
      
      setDebugInfo('Attempting login...');
      
      const result = await dispatch(login({ email, password }));
      
      console.log('📡 Login result:', result);
      
      if (result.meta.requestStatus === 'fulfilled') {
        const payload = result.payload;
        console.log('✅ Login successful');
        console.log('📦 Payload:', payload);
        console.log('🔑 Access token in payload:', !!payload.accessToken);
        
        // Check localStorage after login
        const newToken = localStorage.getItem('accessToken');
        console.log('🔍 New token in localStorage:', !!newToken);
        
        setDebugInfo(`Login successful! Token in localStorage: ${!!newToken}`);
      } else {
        console.log('❌ Login failed:', result.payload);
        setDebugInfo(`Login failed: ${result.payload?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('💥 Login error:', error);
      setDebugInfo(`Error: ${error.message}`);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-4">Login Debug</h3>
      
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
        >
          Test Login
        </button>
      </form>
      
      {debugInfo && (
        <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded">
          <p className="text-sm">{debugInfo}</p>
        </div>
      )}
      
      <div className="mt-4 p-3 bg-gray-100 border rounded">
        <h4 className="font-medium mb-2">Current Auth State:</h4>
        <pre className="text-xs overflow-auto">
          {JSON.stringify(auth, null, 2)}
        </pre>
      </div>
      
      <div className="mt-4 p-3 bg-gray-100 border rounded">
        <h4 className="font-medium mb-2">Environment Info:</h4>
        <p className="text-sm">API URL: {process.env.NEXT_PUBLIC_API_URL || 'Not set'}</p>
        <p className="text-sm">NODE_ENV: {process.env.NODE_ENV || 'Not set'}</p>
        <p className="text-sm">localStorage token: {localStorage.getItem('accessToken') ? 'Present' : 'Not found'}</p>
      </div>
    </div>
  );
} 