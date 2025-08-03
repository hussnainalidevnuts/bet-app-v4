const axios = require('axios');

async function testLiveMatches() {
  try {
    console.log('Testing live matches API...');
    
    // Test the SportMonks inplay API directly
    const apiToken = process.env.SPORTSMONKS_API_KEY;
    if (!apiToken) {
      console.error('SPORTSMONKS_API_KEY is not set');
      return;
    }
    
    const url = `https://api.sportmonks.com/v3/football/livescores/inplay?api_token=${apiToken}&include=periods;state`;
    console.log('Fetching from:', url);
    
    const response = await axios.get(url);
    const inplayData = response.data?.data || [];
    
    console.log(`API returned ${inplayData.length} inplay matches`);
    
    // Process inplay matches with the corrected logic
    const processedMatches = [];
    for (const match of inplayData) {
      // Check if match is ticking (has active timer)
      const isTicking = match.periods?.some(period => period.ticking) || false;
      const hasStarted = match.state_id && [2, 3, 4].includes(match.state_id); // INPLAY states (2=live, 3=halftime, 4=extra time)
      
      console.log(`Match ${match.id}: ${match.name}`);
      console.log(`  - state_id: ${match.state_id}`);
      console.log(`  - state: ${match.state?.state}`);
      console.log(`  - isTicking: ${isTicking}`);
      console.log(`  - hasStarted: ${hasStarted}`);
      console.log(`  - periods:`, match.periods);
      
      if (isTicking && hasStarted) {
        console.log(`  ✅ This match should be included as live`);
        processedMatches.push(match);
      } else {
        console.log(`  ❌ This match should NOT be included as live`);
      }
      console.log('');
    }
    
    console.log(`Final result: ${processedMatches.length} live matches found`);
    
  } catch (error) {
    console.error('Error testing live matches:', error.message);
  }
}

testLiveMatches(); 