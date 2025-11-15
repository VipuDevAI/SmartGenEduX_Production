import { UserClaims } from "../../auth/tokens";

declare global {
  namespace Express {
    interface Request {
      user?: {
        claims: UserClaims;
      };
    }
  }
}

export {};
