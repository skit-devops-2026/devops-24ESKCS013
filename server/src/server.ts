import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

const app = createApp();

async function startServer() {
  try {
    // Attempt database connection on startup
    await connectDB();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[Student Hub API] Warning: Starting server without active DB connection (${msg})`
    );
  }

  const server = app.listen(env.PORT, () => {
    console.log(`[Student Hub API] Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    console.log(
      `[Student Hub API] Health check available at http://localhost:${env.PORT}/api/health`
    );
    console.log(
      `[Student Hub API] Database readiness at http://localhost:${env.PORT}/api/health/db`
    );
  });

  // Handle graceful shutdown
  async function gracefulShutdown(signal: string) {
    console.log(`[Student Hub API] Received ${signal}. Closing server gracefully...`);
    server.close(async () => {
      await disconnectDB();
      console.log('[Student Hub API] Server and database closed cleanly.');
      process.exit(0);
    });
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer();
