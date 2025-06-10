import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get a database connection (only for local development)
async function getDb() {
  // Only import SQLite modules when actually needed (not in production)
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SQLite is not available in production. Please use Supabase.');
  }
  
  // Dynamically resolve database path
  let dbPath = process.env.DB_PATH || 'uwork.sqlite';
  
  try {
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    if (import.meta.url) {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      dbPath = process.env.DB_PATH || path.join(__dirname, 'uwork.sqlite');
    }
  } catch (error) {
    // Use fallback path if import.meta.url is not available
    console.warn('Could not resolve database path, using fallback:', dbPath);
  }
  
  const { default: sqlite3 } = await import('sqlite3');
  const { open } = await import('sqlite');
  
  return open({
    filename: dbPath,
    driver: sqlite3.Database
  });
}

// Universal database getter that works in all environments
export async function getDbConnection() {
  // In production or when explicitly using Supabase, ONLY use Supabase
  if (process.env.NODE_ENV === 'production' || process.env.USE_SUPABASE === 'true') {
    const { getDbConnection } = await import('./supabase-simple.js');
    return await getDbConnection();
  } else {
    // Use SQLite for local development only
    return await getDb();
  }
}

export { getDb };