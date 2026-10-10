import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

// The token is signed, so the identity inside it can be trusted without asking the database on every request
// (each database trip costs about 0.2 s from the hosted API). Trade-off: a user deleted from the database keeps
// access until the 12 h token expires; the app has no way to delete users.
export const signToken = (user, secret) =>
  jwt.sign({ sub: user.id, name: user.name, email: user.email }, secret, { expiresIn: '12h' });

export const requireAuth = (jwtSecret) => async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required.');

  let payload;
  try {
    payload = jwt.verify(token, jwtSecret);
  } catch {
    throw new AppError(401, 'UNAUTHENTICATED', 'Invalid or expired token.');
  }

  // A signed token with a malformed subject can only come from a bug or a wrong secret: refuse it cleanly (401, not a 500).
  if (typeof payload.sub !== 'string' || !/^[a-f\d]{24}$/i.test(payload.sub)) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Invalid or expired token.');
  }

  if (payload.name && payload.email) {
    req.user = { _id: new mongoose.Types.ObjectId(payload.sub), id: String(payload.sub), name: payload.name, email: payload.email };
    return next();
  }

  // Tokens issued before identity was embedded carry only `sub`: look the user up (they expire within 12 h).
  const user = await User.findById(payload.sub);
  if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'User no longer exists.');
  req.user = user;
  next();
};
