import { loadEnv } from './config/env.js';
import { connectDb } from './config/db.js';
import { createApp } from './app.js';
import { seedUsers } from './seed.js';

const env = loadEnv();
await connectDb(env.mongoUri);
if (env.seedDemoUsers) {
  await seedUsers(); // idempotent; resets only the demo users' password to the documented one
  console.log('Demo users seeded.');
}
createApp({ jwtSecret: env.jwtSecret, clientUrl: env.clientUrl }).listen(env.port, () =>
  console.log(`API listening on :${env.port}`),
);
