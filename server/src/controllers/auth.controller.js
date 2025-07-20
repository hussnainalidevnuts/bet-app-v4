import User from "../models/User.js";
import UserService from "../services/user.service.js";
import {
  generateToken,
  generateRefreshToken,
  verifyToken,
} from "../utils/jwt.js";

// Set cookie options
const getCookieOptions = () => {
  const options = {
    httpOnly: true,
    secure: false, // Temporarily disable secure for testing
    sameSite: "lax", // Temporarily use lax for testing
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  
  console.log("🍪 Cookie options generated:", options);
  return options;
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("🔐 Login attempt for:", email);
    console.log("🌍 Environment:", process.env.NODE_ENV);
    console.log("🍪 Cookie options:", getCookieOptions());

    // Use UserService to authenticate user
    const user = await UserService.authenticateUser(email, password);

    // Generate tokens
    const accessToken = generateToken({ userId: user._id });
    const refreshToken = generateRefreshToken({ userId: user._id });

    console.log("🔑 Generated access token:", !!accessToken);
    console.log("🔄 Generated refresh token:", !!refreshToken);

    // Set cookies
    res.cookie("accessToken", accessToken, getCookieOptions());
    res.cookie("refreshToken", refreshToken, {
      ...getCookieOptions(),
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days for refresh token
    });

    const responseData = {
      success: true,
      message: "Login successful",
      user: user.toJSON(),
      accessToken,
    };

    console.log("📤 Sending response with access token:", !!responseData.accessToken);
    console.log("📤 Full response data:", {
      success: responseData.success,
      message: responseData.message,
      user: responseData.user ? "User object present" : "No user object",
      accessToken: responseData.accessToken ? "Token present" : "No token"
    });

    res.json(responseData);
  } catch (error) {
    console.error("Login error:", error);

    // Handle custom errors from UserService
    if (error.isOperational) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errorCode: error.errorCode,
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = (req, res) => {
  try {
    // Clear cookies
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    // Use UserService to get user by ID
    const user = await UserService.getUserById(req.user._id);

    res.json({
      success: true,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error("Get profile error:", error);

    // Handle custom errors from UserService
    if (error.isOperational) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errorCode: error.errorCode,
      });
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token not provided",
      });
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken);

    // Use UserService to get user by ID
    const user = await UserService.getUserById(decoded.userId);

    // Generate new access token
    const newAccessToken = generateToken({ userId: user._id });

    // Set new access token cookie
    res.cookie("accessToken", newAccessToken, getCookieOptions());

    res.json({
      success: true,
      message: "Token refreshed successfully",
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error("Refresh token error:", error);

    // Handle custom errors from UserService
    if (error.isOperational) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
        errorCode: error.errorCode,
      });
    }

    res.status(401).json({
      success: false,
      message: "Invalid refresh token",
      error: error.message,
    });
  }
};
