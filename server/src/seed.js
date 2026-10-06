import { loadEnv } from './config/env.js';
import { connectDb } from './config/db.js';
import mongoose from 'mongoose';
import { pathToFileURL } from 'node:url';
import { User } from './models/User.js';

// Documented demo password (README). Demo accounts only; not for real data.
export const DEMO_PASSWORD = 'Demo@1234';

export const DEMO_USERS = [
  { name: 'Alice Anderson', email: 'alice@example.com' },
  { name: 'Bob Brown', email: 'bob@example.com' },
  { name: 'Carol Clark', email: 'carol@example.com' },
];

// Idempotent: upserts by email and (re)sets the demo password. Never touches documents.
export async function seedUsers() {
  const passwordHash = await User.hashPassword(DEMO_PASSWORD);
  for (const u of DEMO_USERS) {
    await User.updateOne({ email: u.email }, { $set: { passwordHash }, $setOnInsert: u }, { upsert: true });
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = loadEnv();
  await connectDb(env.mongoUri);
  await seedUsers();
  console.log(`Seeded ${DEMO_USERS.length} demo users.`);
  await mongoose.disconnect();
}
