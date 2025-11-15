import * as jose from "jose";
import { createHash, randomBytes } from "crypto";

// JWT Configuration
const ACCESS_TOKEN_EXPIRY = "15m"; // 15 minutes
const REFRESH_TOKEN_EXPIRY = "7d"; // 7 days
const JWT_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("SESSION_SECRET or JWT_SECRET environment variable is required");
}

// Convert secret to Uint8Array for JWT signing (HS512)
const secretKey = new TextEncoder().encode(JWT_SECRET);

// For JWE encryption (A256GCM), we need exactly 32 bytes (256 bits)
// Derive a fixed-length key from SESSION_SECRET using SHA-256
const encryptionKey = createHash("sha256").update(JWT_SECRET).digest();

export interface UserClaims {
  sub: string; // User ID
  email: string;
  first_name?: string;
  last_name?: string;
  profile_image_url?: string;
  role: string;
  school_id?: number | null;
}

export interface SessionData {
  claims: UserClaims;
  exp?: number; // JWT expiration timestamp (added by jose)
  iat?: number; // JWT issued at timestamp (added by jose)
}

// Create short-lived access token JWT
export async function createAccessToken(
  userClaims: UserClaims
): Promise<string> {
  const sessionData: SessionData = {
    claims: userClaims,
  };

  const jwt = await new jose.SignJWT(sessionData as any)
    .setProtectedHeader({ alg: "HS512" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(secretKey);

  return jwt;
}

// Verify and decode access token
export async function verifyAccessToken(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jose.jwtVerify(token, secretKey);
    return payload as unknown as SessionData;
  } catch (error) {
    return null;
  }
}

// Create encrypted refresh token
export async function createRefreshToken(userId: string): Promise<string> {
  const payload = {
    userId,
    tokenId: randomBytes(16).toString("hex"), // Unique token ID for revocation
    rotationCounter: 0,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  };

  const jwe = await new jose.EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .encrypt(encryptionKey);

  return jwe;
}

// Rotate refresh token (increment rotation counter)
export async function rotateRefreshToken(oldToken: string): Promise<string | null> {
  const refreshData = await verifyRefreshToken(oldToken);
  
  if (!refreshData) {
    return null;
  }

  const payload = {
    userId: refreshData.userId,
    tokenId: refreshData.tokenId, // Keep same tokenId
    rotationCounter: refreshData.rotationCounter + 1, // Increment counter
  };

  // Use .setExpirationTime only (jose handles expiry correctly)
  const jwe = await new jose.EncryptJWT(payload)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY) // 7 days from now
    .encrypt(encryptionKey);

  return jwe;
}

// Verify and decrypt refresh token
export async function verifyRefreshToken(token: string): Promise<{
  userId: string;
  tokenId: string;
  rotationCounter: number;
} | null> {
  try {
    const { payload } = await jose.jwtDecrypt(token, encryptionKey);
    return {
      userId: payload.userId as string,
      tokenId: payload.tokenId as string,
      rotationCounter: payload.rotationCounter as number,
    };
  } catch (error) {
    return null;
  }
}

// Generate hash for refresh token storage
export function hashRefreshToken(tokenId: string, rotationCounter: number): string {
  return createHash("sha256")
    .update(`${tokenId}:${rotationCounter}`)
    .digest("hex");
}

// Check if token is near expiry (< 2 minutes remaining)
export function isTokenNearExpiry(exp?: number): boolean {
  if (!exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return exp - now < 120; // Less than 2 minutes
}
