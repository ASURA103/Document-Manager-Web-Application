import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Never returned by queries unless explicitly selected.
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true },
);

const COST = 10;
userSchema.statics.hashPassword = (plain) => bcrypt.hash(plain, COST);
userSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
export const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', COST);

export const User = mongoose.model('User', userSchema);
