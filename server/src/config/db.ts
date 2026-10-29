import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDB(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    const host = conn.connection.host;
    const dbName = conn.connection.name;
    console.log(`[Database] MongoDB connected successfully to ${host}/${dbName}`);
    if (env.NODE_ENV === 'development') {
      console.log(`[Database Tip] Active Database: "${dbName}"`);
      console.log(
        `[Database Tip] Backup command: mongodump --db ${dbName} --out ./backup-before-backfill`
      );
    }
    return conn;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown connection error';
    console.error(`[Database Error] Failed to connect to MongoDB: ${message}`);
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[Database] MongoDB connection closed cleanly.');
  }
}

export function getDatabaseStatus() {
  const stateMap: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const state = mongoose.connection.readyState;
  const isConnected = state === 1;

  return {
    connected: isConnected,
    state: stateMap[state] || 'unknown',
    driver: 'mongoose',
    host: isConnected ? mongoose.connection.host : undefined,
    name: isConnected ? mongoose.connection.name : undefined,
  };
}
