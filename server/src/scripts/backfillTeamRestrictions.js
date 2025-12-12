// Script to backfill TeamRestriction entries from existing won bets in database
// This will copy last 15-20 won bets and create team restrictions for them

import mongoose from 'mongoose';
import Bet from '../models/Bet.js';
import TeamRestriction from '../models/TeamRestriction.js';
import betServiceInstance from '../services/bet.service.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// BetService is exported as an instance, not a class, so use it directly
const betService = betServiceInstance;

async function backfillTeamRestrictions() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/bet-app';
    console.log(`🔗 Connecting to MongoDB: ${mongoUri.replace(/\/\/.*@/, '//***@')}`); // Hide credentials
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find last 15-20 won bets (within last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    console.log(`\n🔍 Finding won bets from last 7 days (since ${sevenDaysAgo.toISOString()})...`);
    
    const wonBets = await Bet.find({
      status: 'won',
      updatedAt: { $gte: sevenDaysAgo } // Won bets from last 7 days
    })
      .sort({ updatedAt: -1 }) // Most recent first
      .limit(20) // Get last 20 bets
      .lean();

    console.log(`📊 Found ${wonBets.length} won bets from last 7 days`);

    if (wonBets.length === 0) {
      console.log('⚠️ No won bets found in last 7 days. Nothing to backfill.');
      await mongoose.disconnect();
      return;
    }

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const bet of wonBets) {
      try {
        console.log(`\n🔍 Processing bet ID: ${bet._id}`);
        console.log(`   - User ID: ${bet.userId}`);
        console.log(`   - Status: ${bet.status}`);
        console.log(`   - Updated At: ${bet.updatedAt}`);
        console.log(`   - Bet Option: ${bet.betOption}`);
        console.log(`   - Selection: ${bet.selection}`);

        // Extract team name from bet
        const homeName = bet.unibetMeta?.homeName || (bet.teams?.includes(' vs ') ? bet.teams.split(' vs ')[0].trim() : null);
        const awayName = bet.unibetMeta?.awayName || (bet.teams?.includes(' vs ') ? bet.teams.split(' vs ')[1].trim() : null);
        const selection = bet.betOption || bet.selection;

        console.log(`   - Home Name: ${homeName}`);
        console.log(`   - Away Name: ${awayName}`);
        console.log(`   - Selection: ${selection}`);

        if (!homeName || !awayName || !selection) {
          console.log(`   ⚠️ SKIPPED: Missing team names or selection`);
          skipped++;
          continue;
        }

        // Extract team name from bet selection
        const selectedTeam = betService.extractTeamFromBetSelection(selection, homeName, awayName);

        if (!selectedTeam) {
          console.log(`   ⚠️ SKIPPED: Bet is not team-specific (selection: ${selection})`);
          skipped++;
          continue;
        }

        console.log(`   - Extracted Team: ${selectedTeam}`);

        // Check if restriction already exists
        const existingRestriction = await TeamRestriction.findOne({
          userId: bet.userId,
          normalizedTeamName: selectedTeam.toLowerCase().trim(),
          winningBetId: bet._id
        });

        if (existingRestriction) {
          console.log(`   ⏭️ SKIPPED: Restriction already exists for this bet`);
          skipped++;
          continue;
        }

        // Calculate expiry date (7 days from when bet was won)
        const expiresAt = new Date(bet.updatedAt || bet.createdAt);
        expiresAt.setDate(expiresAt.getDate() + 7);

        // Check if restriction is still valid (not expired)
        if (expiresAt < new Date()) {
          console.log(`   ⏭️ SKIPPED: Bet was won more than 7 days ago (expired)`);
          skipped++;
          continue;
        }

        // Create restriction
        const restriction = new TeamRestriction({
          userId: bet.userId,
          teamName: selectedTeam,
          normalizedTeamName: selectedTeam.toLowerCase().trim(),
          winningBetId: bet._id,
          expiresAt: expiresAt
        });

        await restriction.save();

        console.log(`   ✅ CREATED: Team restriction for "${selectedTeam}" (expires: ${expiresAt.toISOString()})`);
        created++;

      } catch (error) {
        console.error(`   ❌ ERROR processing bet ${bet._id}:`, error.message);
        errors++;
      }
    }

    console.log(`\n📊 ========== BACKFILL SUMMARY ==========`);
    console.log(`   ✅ Created: ${created} restrictions`);
    console.log(`   ⏭️ Skipped: ${skipped} bets`);
    console.log(`   ❌ Errors: ${errors} bets`);
    console.log(`   📊 Total Processed: ${wonBets.length} bets`);
    console.log(`==========================================\n`);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error in backfill script:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
backfillTeamRestrictions();

