// models/TeamRestriction.js
import mongoose from "mongoose";

const teamRestrictionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true, // Index for faster queries
    },
    teamName: {
      type: String,
      required: [true, "Team name is required"],
      trim: true,
      index: true, // Index for faster queries
    },
    // Store normalized team name for better matching (case-insensitive, trimmed)
    normalizedTeamName: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    // The bet that triggered this restriction
    winningBetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bet",
      required: true,
    },
    // When the restriction expires (7 days from when bet was won)
    expiresAt: {
      type: Date,
      required: [true, "Expiration date is required"],
      index: true, // Index for TTL cleanup
      expires: 0, // MongoDB TTL index will auto-delete expired documents
    },
    // When the restriction was created
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for faster queries: userId + normalizedTeamName + expiresAt
teamRestrictionSchema.index({ userId: 1, normalizedTeamName: 1, expiresAt: 1 });

// TTL index to auto-delete expired restrictions
teamRestrictionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const TeamRestriction = mongoose.model("TeamRestriction", teamRestrictionSchema);

export default TeamRestriction;

