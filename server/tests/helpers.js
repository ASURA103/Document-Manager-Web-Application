import mongoose from 'mongoose';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/User.js';

const JWT_SECRET = 'test-secret';
export const PASSWORD = 'test-password-1';
const TEST_BASE = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/document_manager_test';

export async function setup() {
  // One database per test file so files can run in parallel without clobbering each other.
  await mongoose.connect(`${TEST_BASE}_${process.pid}_${Date.now()}`);
  await mongoose.connection.dropDatabase();
  await Promise.all([mongoose.model('Document').init(), mongoose.model('DocumentShare').init(), User.init()]);
  const app = createApp({ jwtSecret: JWT_SECRET, clientUrl: 'http://localhost:5173' });
  const api = request(app);
  const users = {};
  const passwordHash = await User.hashPassword(PASSWORD);
  for (const name of ['alice', 'bob', 'carol']) {
    const email = `${name}@example.com`;
    await User.create({ name, email, passwordHash });
    const res = await api.post('/api/auth/login').send({ email, password: PASSWORD });
    users[name] = { email, token: res.body.data.token };
  }
  return { api, users };
}

export async function teardown() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}

export const as = (user) => ({ Authorization: `Bearer ${user.token}` });
