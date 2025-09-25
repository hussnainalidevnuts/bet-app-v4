import mongoose from "mongoose";
import betService from "../services/bet.service.js";

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;
  
  try {
    await mongoose.connect(mongoURI);
    console.log("Connected to MongoDB");
    console.log("MongoDB URI:", mongoURI.replace(/\/\/[^:]+:[^@]+@/, "//***:***@")); // Hide credentials in logs
    // Recover missed bets on startup
    return true;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
};

export default connectDB;
