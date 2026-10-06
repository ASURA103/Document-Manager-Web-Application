import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

export const signToken = (user, secret) =>
  jwt.sign({ sub: user.id }, secret, { expiresIn: '12h' });

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
  const user = await User.findById(payload.sub);
  if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'User no longer exists.');
  req.user = user;
  next();
};
