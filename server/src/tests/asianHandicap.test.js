// Simple test for Asian Handicap calculation
// This tests the quarter handicap scenario (+1.25) from the provided bet object

// Simplified Asian Handicap calculation function for testing
function calculateAsianHandicap(bet, matchResult) {
  const { homeScore, awayScore } = matchResult;
  const { handicap } = bet.betDetails;
  const selectedTeam = parseInt(bet.selection);
  const stake = bet.stake;
  const odds = bet.odds;
  
  // Parse handicap value
  const handicapValue = parseFloat(handicap);
  
  // Determine if it's a quarter handicap
  const isQuarterHandicap = Math.abs(handicapValue % 1) === 0.25 || Math.abs(handicapValue % 1) === 0.75;
  
  if (isQuarterHandicap) {
    return calculateQuarterHandicap(selectedTeam, handicapValue, homeScore, awayScore, stake, odds);
  } else {
    return calculateStandardHandicap(selectedTeam, handicapValue, homeScore, awayScore, stake, odds);
  }
}

function calculateQuarterHandicap(selectedTeam, handicap, homeScore, awayScore, stake, odds) {
  // Split quarter handicap into two bets
  const halfStake = stake / 2;
  let handicap1, handicap2;
  
  if (Math.abs(handicap % 1) === 0.25) {
    // .25 handicaps split into whole and half
    if (handicap > 0) {
      handicap1 = Math.floor(handicap);      // +1.25 -> +1.0
      handicap2 = Math.floor(handicap) + 0.5; // +1.25 -> +1.5
    } else {
      handicap1 = Math.ceil(handicap);       // -1.25 -> -1.0
      handicap2 = Math.ceil(handicap) - 0.5; // -1.25 -> -1.5
    }
  } else if (Math.abs(handicap % 1) === 0.75) {
    // .75 handicaps split into half and whole
    if (handicap > 0) {
      handicap1 = Math.floor(handicap) + 0.5; // +1.75 -> +1.5
      handicap2 = Math.ceil(handicap);        // +1.75 -> +2.0
    } else {
      handicap1 = Math.ceil(handicap) - 0.5;  // -1.75 -> -1.5
      handicap2 = Math.floor(handicap);       // -1.75 -> -2.0
    }
  }
  
  console.log(`  Quarter handicap ${handicap} split into: ${handicap1} and ${handicap2}`);
  
  // Calculate results for both splits
  const result1 = calculateSingleHandicapResult(selectedTeam, handicap1, homeScore, awayScore, halfStake, odds);
  const result2 = calculateSingleHandicapResult(selectedTeam, handicap2, homeScore, awayScore, halfStake, odds);
  
  console.log(`  Split 1 (${handicap1}): ${result1.outcome}, payout: ${result1.payout}`);
  console.log(`  Split 2 (${handicap2}): ${result2.outcome}, payout: ${result2.payout}`);
  
  // Combine results
  const totalPayout = result1.payout + result2.payout;
  
  // Determine overall outcome
  let outcome;
  if (result1.outcome === "won" && result2.outcome === "won") {
    outcome = "won";
  } else if (result1.outcome === "lost" && result2.outcome === "lost") {
    outcome = "lost";
  } else if (result1.outcome === "push" && result2.outcome === "push") {
    outcome = "push";
  } else {
    // Mixed results - check if there's any profit
    outcome = totalPayout > stake ? "won" : (totalPayout === stake ? "push" : "lost");
  }
  
  return { outcome, payout: totalPayout };
}

function calculateStandardHandicap(selectedTeam, handicap, homeScore, awayScore, stake, odds) {
  return calculateSingleHandicapResult(selectedTeam, handicap, homeScore, awayScore, stake, odds);
}

function calculateSingleHandicapResult(selectedTeam, handicap, homeScore, awayScore, stake, odds) {
  let adjustedHomeScore = homeScore;
  let adjustedAwayScore = awayScore;
  
  // Apply handicap to the selected team
  if (selectedTeam === 1) {
    adjustedHomeScore += handicap;
  } else {
    adjustedAwayScore += handicap;
  }
  
  console.log(`    Handicap ${handicap}: Original ${homeScore}-${awayScore}, Adjusted ${adjustedHomeScore}-${adjustedAwayScore}`);
  
  // Determine outcome
  if (adjustedHomeScore > adjustedAwayScore) {
    // Home team wins after handicap
    if (selectedTeam === 1) {
      return { outcome: "won", payout: stake * odds };
    } else {
      return { outcome: "lost", payout: 0 };
    }
  } else if (adjustedAwayScore > adjustedHomeScore) {
    // Away team wins after handicap
    if (selectedTeam === 2) {
      return { outcome: "won", payout: stake * odds };
    } else {
      return { outcome: "lost", payout: 0 };
    }
  } else {
    // Draw after handicap - refund stake
    return { outcome: "push", payout: stake };
  }
}

// Test data - the exact bet object provided
const testBet = {
  "_id": "6891e440244ccfea25aa33df",
  "userId": "6868e98f17171be7cefbd953",
  "matchId": "19516023",
  "oddId": "183976899736",
  "betOption": "2",
  "odds": 1.95,
  "stake": 100,
  "payout": 0,
  "status": "pending",
  "matchDate": new Date("2025-08-05T16:00:00.000Z"),
  "estimatedMatchEnd": new Date("2025-08-05T17:45:00.000Z"),
  "betOutcomeCheckTime": new Date("2025-08-05T18:05:00.000Z"),
  "teams": "Bayer 04 Leverkusen vs Pisa",
  "selection": "2",
  "inplay": false,
  "betDetails": {
    "market_id": "6",
    "market_name": "Asian Handicap",
    "label": "2",
    "value": 1.95,
    "total": null,
    "market_description": "Asian Handicap",
    "handicap": "+1.25",
    "name": "2"
  },
  "combination": [],
  "createdAt": new Date("2025-08-05T11:00:16.132Z"),
  "updatedAt": new Date("2025-08-05T11:00:16.132Z"),
  "__v": 0
};

// Mock match result data for different scenarios
// For +1.25 handicap on Team 2, we need scenarios where Team 2 loses by different margins
const testScenarios = [
  {
    name: "Team 2 wins by any margin (Full Win)",
    matchResult: { homeScore: 0, awayScore: 1 }, // Away team (2) wins
    expectedOutcome: "won",
    expectedPayout: 195 // Both splits win: 100 * 1.95 = 195
  },
  {
    name: "Draw (Full Win)", 
    matchResult: { homeScore: 1, awayScore: 1 }, // Draw
    expectedOutcome: "won",
    expectedPayout: 195 // Both splits win with +1.25 handicap
  },
  {
    name: "Team 2 loses by 1 goal (Half Win)",
    matchResult: { homeScore: 1, awayScore: 0 }, // Team 2 loses by 1
    expectedOutcome: "won",
    expectedPayout: 147.5 // Split 1 (+1.0): push (50), Split 2 (+1.5): win (97.5) = 147.5 total
  },
  {
    name: "Team 2 loses by 2+ goals (Full Loss)",
    matchResult: { homeScore: 2, awayScore: 0 }, // Team 2 loses by 2
    expectedOutcome: "lost",
    expectedPayout: 0 // Both splits lose
  }
];

// Function to run a single test scenario
function runTestScenario(scenario) {
  console.log(`\n--- Testing: ${scenario.name} ---`);
  console.log(`Match Result: Home ${scenario.matchResult.homeScore} - ${scenario.matchResult.awayScore} Away`);
  console.log(`Handicap: ${testBet.betDetails.handicap} (Team ${testBet.selection})`);
  console.log(`Stake: ${testBet.stake}, Odds: ${testBet.odds}`);
  
  try {
    const result = calculateAsianHandicap(testBet, scenario.matchResult);
    
    console.log(`Expected Outcome: ${scenario.expectedOutcome}`);
    console.log(`Actual Outcome: ${result.outcome}`);
    console.log(`Expected Payout: ${scenario.expectedPayout}`);
    console.log(`Actual Payout: ${result.payout}`);
    
    // Check if results match expectations
    const outcomeMatch = result.outcome === scenario.expectedOutcome;
    const payoutMatch = Math.abs(result.payout - scenario.expectedPayout) < 0.01; // Allow for small floating point differences
    
    if (outcomeMatch && payoutMatch) {
      console.log("✅ TEST PASSED");
      return true;
    } else {
      console.log("❌ TEST FAILED");
      if (!outcomeMatch) console.log(`  - Outcome mismatch: expected ${scenario.expectedOutcome}, got ${result.outcome}`);
      if (!payoutMatch) console.log(`  - Payout mismatch: expected ${scenario.expectedPayout}, got ${result.payout}`);
      return false;
    }
  } catch (error) {
    console.log("❌ TEST ERROR:", error.message);
    return false;
  }
}

// Main test function
function runAsianHandicapTests() {
  console.log("=== Asian Handicap Quarter Handicap (+1.25) Test ===");
  console.log("Testing bet object with quarter handicap for Team 2");
  console.log("This should split into two bets: +1.0 and +1.5");
  
  let passedTests = 0;
  let totalTests = testScenarios.length;
  
  testScenarios.forEach(scenario => {
    if (runTestScenario(scenario)) {
      passedTests++;
    }
  });
  
  console.log(`\n=== TEST SUMMARY ===`);
  console.log(`Passed: ${passedTests}/${totalTests}`);
  console.log(`Status: ${passedTests === totalTests ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  return passedTests === totalTests;
}

// Additional test for edge cases
function runEdgeCaseTests() {
  console.log("\n=== Edge Case Tests ===");
  
  // Test with different quarter handicaps
  const edgeCases = [
    { handicap: "+0.25", team: "1" },
    { handicap: "-0.75", team: "2" },
    { handicap: "+2.25", team: "1" }
  ];
  
  edgeCases.forEach(edgeCase => {
    console.log(`\nTesting handicap: ${edgeCase.handicap} for team ${edgeCase.team}`);
    
    const testBetCopy = {
      ...testBet,
      selection: edgeCase.team,
      betDetails: {
        ...testBet.betDetails,
        handicap: edgeCase.handicap
      }
    };
    
    try {
      const result = calculateAsianHandicap(testBetCopy, { homeScore: 1, awayScore: 0 });
      console.log(`✅ Calculation successful - Outcome: ${result.outcome}, Payout: ${result.payout}`);
    } catch (error) {
      console.log(`❌ Calculation failed: ${error.message}`);
    }
  });
}

// Run the tests immediately
console.log("=== STARTING TESTS ===");
console.log("Starting Asian Handicap Tests...\n");

const mainTestsPassed = runAsianHandicapTests();
runEdgeCaseTests();

console.log("\n=== FINAL RESULT ===");
console.log(mainTestsPassed ? "✅ Primary test suite PASSED" : "❌ Primary test suite FAILED");

export { runAsianHandicapTests, runEdgeCaseTests };
