import bcrypt from 'bcryptjs';
import { User, DUMMY_HASH } from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { AppError } from '../utils/AppError.js';

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });

export const login = (jwtSecret) => async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  // Same error and similar timing whether the email or the password is wrong.
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  res.json({ success: true, data: { token: signToken(user, jwtSecret), user: publicUser(user) } });
};

export const me = (req, res) => res.json({ success: true, data: publicUser(req.user) });
