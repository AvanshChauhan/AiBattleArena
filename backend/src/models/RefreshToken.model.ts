import { Schema, model } from "mongoose";

// ─── Interface ────────────────────────────────────────────────────────────────
export interface IRefreshToken {
  token: string;      // The raw JWT refresh token string
  username: string;   // Owner
  expiresAt: Date;    // MongoDB TTL index auto-deletes expired docs
  createdAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    token: {
      type: String,
      required: true,
      index: true,       // Fast lookup when validating refresh requests
    },
    username: {
      type: String,
      required: true,
      index: true,       // Fast lookup on logout-all (revoke all for a user)
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // MongoDB TTL — auto-deletes expired tokens
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const RefreshTokenModel = model<IRefreshToken>("RefreshToken", refreshTokenSchema);
