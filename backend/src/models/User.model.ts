import { Schema, model } from "mongoose";

// ─── Interface ────────────────────────────────────────────────────────────────
export interface IUser {
  username: string;       // lowercase, trimmed, unique
  passwordHash: string;   // bcrypt hash
  createdAt: Date;
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 32,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const UserModel = model<IUser>("User", userSchema);
