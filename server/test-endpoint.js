const axios = require('axios');

async function testEndpoint() {
  try {
    console.log('Testing inplay-odds endpoint...');
    
    // Test the endpoint with the match ID from the error
    const matchId = '19441640';
    const url = `http://localhost:4000/api/fixtures/${matchId}/inplay-odds`;
    
    console.log('Testing URL:', url);
    
    const response = await axios.get(url);
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('Error testing endpoint:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testEndpoint(); 