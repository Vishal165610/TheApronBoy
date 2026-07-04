// SERVER-ONLY. Never import this from a component or client-side file.
import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is not set");

let client: MongoClient;
let db: Db;

// Standard singleton pattern for serverless environments
if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so the value is preserved
  // across module reloads caused by HMR (Hot Module Replacement).
  if (!(global as any)._mongoClient) {
    (global as any)._mongoClient = new MongoClient(uri);
  }
  client = (global as any)._mongoClient;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri);
}

export async function getDb(): Promise<Db> {
  if (db) return db;
  
  // The driver will handle connecting automatically when you request the db context
  db = client.db("apronboy");
  return db;
}