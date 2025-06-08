import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path
const dbPath = process.env.DB_PATH || path.join(__dirname, 'uwork.sqlite');

// Get a database connection
async function getDb() {
  return open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

export { getDb };