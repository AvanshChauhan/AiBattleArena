import { Router } from "express";
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import { UserModel } from "../models/User.model.js";
import { RefreshTokenModel } from "../models/RefreshToken.model.js";

const router = Router();

// ─── Constants ─────────────────────────────────────────────────────────────────
const SALT_ROUNDS = 10;
const COOKIE_NAME = "refreshToken";

// Cookie options — httpOnly so JS can't read it, sameSite lax for local dev
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production", // HTTPS only in prod
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: "/",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function signAccessToken(username: string): string {
  return jwt.sign({ username }, config.JWT_SECRET, {
    expiresIn: "15m",
  });
}

function signRefreshToken(username: string): string {
  return jwt.sign({ username }, config.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
}

/** Parse "7d" / "15m" notation to milliseconds for DB expiresAt */
function parseDurationMs(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match || !match[1] || !match[2]) return 7 * 24 * 60 * 60 * 1000; // fallback 7d
  const num = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return num * (multipliers[unit] ?? 86_400_000);
}

function validateInput(username: unknown, password: unknown): string | null {
  if (typeof username !== "string" || username.trim().length < 3) {
    return "Username must be at least 3 characters.";
  }
  if (typeof username !== "string" || username.trim().length > 32) {
    return "Username must be at most 32 characters.";
  }
  if (typeof password !== "string" || password.length < 6) {
    return "Password must be at least 6 characters.";
  }
  return null;
}

/** Issue both tokens, save refresh token to DB, set cookie */
async function issueTokens(
  username: string,
  res: Response
): Promise<{ accessToken: string }> {
  const accessToken  = signAccessToken(username);
  const refreshToken = signRefreshToken(username);

  // Persist refresh token in MongoDB
  const expiresAt = new Date(Date.now() + parseDurationMs(config.REFRESH_TOKEN_EXPIRY));
  await RefreshTokenModel.create({ token: refreshToken, username, expiresAt });

  // Set as httpOnly cookie — browser sends it automatically on /auth/refresh
  res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTIONS);

  return { accessToken };
}

// ─── POST /auth/register ───────────────────────────────────────────────────────
router.post("/register", async (req: Request, res: Response) => {
  const { username, password } = req.body ?? {};

  const validationError = validateInput(username, password);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const key = (username as string).toLowerCase().trim();

  try {
    // Check duplicate
    const existing = await UserModel.findOne({ username: key }).lean();
    if (existing) {
      res.status(409).json({ error: "Username already taken. Please choose another." });
      return;
    }

    const passwordHash = await bcrypt.hash(password as string, SALT_ROUNDS);
    await UserModel.create({ username: key, passwordHash });

    const { accessToken } = await issueTokens(key, res);
    res.status(201).json({ token: accessToken, username: key });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Failed to create account. Please try again." });
  }
});

// ─── POST /auth/login ──────────────────────────────────────────────────────────
router.post("/login", async (req: Request, res: Response) => {
  const { username, password } = req.body ?? {};

  const validationError = validateInput(username, password);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const key = (username as string).toLowerCase().trim();

  try {
    const user = await UserModel.findOne({ username: key }).lean();

    // Constant-time: always hash even if user not found (prevents timing attacks)
    const dummyHash = "$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012";
    const match = await bcrypt.compare(
      password as string,
      user?.passwordHash ?? dummyHash
    );

    if (!user || !match) {
      res.status(401).json({ error: "Invalid username or password." });
      return;
    }

    const { accessToken } = await issueTokens(key, res);
    res.json({ token: accessToken, username: key });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

// ─── POST /auth/refresh ────────────────────────────────────────────────────────
// Called by frontend when the access token expires (401 received).
// The browser automatically sends the httpOnly refreshToken cookie.
router.post("/refresh", async (req: Request, res: Response) => {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;

  if (!token) {
    res.status(401).json({ error: "No refresh token." });
    return;
  }

  try {
    // 1. Verify JWT signature & expiry
    const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET) as { username: string };

    // 2. Check token exists in DB (revocation check)
    const stored = await RefreshTokenModel.findOne({ token }).lean();
    if (!stored) {
      res.clearCookie(COOKIE_NAME, { path: "/" });
      res.status(401).json({ error: "Refresh token revoked or expired." });
      return;
    }

    // 3. Rotate: delete old token, issue fresh pair
    await RefreshTokenModel.deleteOne({ token });
    const { accessToken } = await issueTokens(decoded.username, res);

    res.json({ token: accessToken, username: decoded.username });
  } catch {
    // JWT invalid / expired
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.status(401).json({ error: "Refresh token invalid or expired. Please log in again." });
  }
});

// ─── POST /auth/logout ─────────────────────────────────────────────────────────
router.post("/logout", async (req: Request, res: Response) => {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;

  if (token) {
    // Delete from DB (revoke this device's refresh token)
    await RefreshTokenModel.deleteOne({ token }).catch(console.error);
  }

  res.clearCookie(COOKIE_NAME, { path: "/" });
  res.json({ message: "Logged out successfully." });
});

// ─── POST /auth/logout-all ─────────────────────────────────────────────────────
// Revokes ALL refresh tokens for the user (logout from every device).
router.post("/logout-all", async (req: Request, res: Response) => {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;

  if (!token) {
    res.status(401).json({ error: "Not authenticated." });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET) as { username: string };
    await RefreshTokenModel.deleteMany({ username: decoded.username });
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.json({ message: "Logged out from all devices." });
  } catch {
    res.clearCookie(COOKIE_NAME, { path: "/" });
    res.status(401).json({ error: "Invalid session." });
  }
});

export default router;
