import type { Response } from "express";

export const COOKIE_NAMES = {
  ACCESS_TOKEN: "smartgen_access",
  REFRESH_TOKEN: "smartgen_refresh",
};

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export function setAccessTokenCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAMES.ACCESS_TOKEN, token, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60 * 1000, // 15 minutes
  });
}

export function setRefreshTokenCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAMES.REFRESH_TOKEN, token, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(COOKIE_NAMES.ACCESS_TOKEN, COOKIE_OPTIONS);
  res.clearCookie(COOKIE_NAMES.REFRESH_TOKEN, COOKIE_OPTIONS);
}
