import 'dotenv/config';

const required = ['MONGO_URI', 'JWT_SECRET'];

export function loadEnv() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  return {
    port: Number(process.env.PORT) || 4000,
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    nodeEnv: process.env.NODE_ENV || 'development',
    // Hosts without a shell (e.g. Render free tier) can seed the demo users at startup instead of `npm run seed`.
    seedDemoUsers: process.env.SEED_DEMO_USERS === 'true',
  };
}
