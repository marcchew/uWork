import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

let supabase;

export function getSupabaseClient() {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
    }

    supabase = createClient(supabaseUrl, supabaseKey);
  }
  
  return supabase;
}

// Helper function to convert SQLite queries to PostgreSQL
export function convertSQLiteToPostgreSQL(query) {
  return query
    .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
    .replace(/BOOLEAN DEFAULT 0/g, 'BOOLEAN DEFAULT FALSE')
    .replace(/BOOLEAN DEFAULT 1/g, 'BOOLEAN DEFAULT TRUE')
    .replace(/TEXT/g, 'TEXT')
    .replace(/TIMESTAMP DEFAULT CURRENT_TIMESTAMP/g, 'TIMESTAMP DEFAULT NOW()')
    .replace(/CREATE TABLE IF NOT EXISTS/g, 'CREATE TABLE IF NOT EXISTS')
    .replace(/FOREIGN KEY \((\w+)\) REFERENCES (\w+) \((\w+)\) ON DELETE CASCADE/g, 
             'CONSTRAINT fk_$1 FOREIGN KEY ($1) REFERENCES $2($3) ON DELETE CASCADE');
}

// Wrapper to make Supabase work like SQLite with direct SQL queries
export class SupabaseWrapper {
  constructor() {
    this.client = getSupabaseClient();
  }

  async get(query, params = []) {
    try {
      // For simple SELECT queries, try to use Supabase query builder if possible
      // Otherwise fall back to raw SQL via RPC function
      const { data, error } = await this.client.rpc('execute_sql', {
        query_text: query,
        query_params: params
      });
      
      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Supabase get error:', error);
      throw error;
    }
  }

  async all(query, params = []) {
    try {
      const { data, error } = await this.client.rpc('execute_sql', {
        query_text: query,
        query_params: params
      });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Supabase all error:', error);
      throw error;
    }
  }

  async run(query, params = []) {
    try {
      const { data, error } = await this.client.rpc('execute_sql_with_return', {
        query_text: query,
        query_params: params
      });
      
      if (error) throw error;
      
      // Extract insert ID from returning data or use affected rows count
      return {
        lastID: data && data.length > 0 && data[0].id ? data[0].id : null,
        changes: data ? data.length : 0
      };
    } catch (error) {
      console.error('Supabase run error:', error);
      throw error;
    }
  }

  async exec(query) {
    try {
      // Split multiple statements and execute each
      const statements = query.split(';').filter(stmt => stmt.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          // Convert SQLite to PostgreSQL syntax
          const pgQuery = convertSQLiteToPostgreSQL(statement.trim());
          
          const { error } = await this.client.rpc('execute_ddl', {
            query_text: pgQuery
          });
          
          if (error) throw error;
        }
      }
    } catch (error) {
      console.error('Supabase exec error:', error);
      throw error;
    }
  }

  async close() {
    // Supabase client doesn't need explicit closing
    return Promise.resolve();
  }

  // Supabase-specific helper methods for better performance
  async getFromTable(tableName, filters = {}, options = {}) {
    try {
      let query = this.client.from(tableName).select(options.select || '*');
      
      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
      
      // Apply options
      if (options.limit) query = query.limit(options.limit);
      if (options.order) query = query.order(options.order.column, { ascending: options.order.ascending });
      
      const { data, error } = options.single ? await query.single() : await query;
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
      return options.single ? data : (data || []);
    } catch (error) {
      console.error(`Supabase getFromTable error for ${tableName}:`, error);
      throw error;
    }
  }

  async insertIntoTable(tableName, data, options = {}) {
    try {
      let query = this.client.from(tableName).insert(data);
      
      if (options.returning) {
        query = query.select(options.returning);
      }
      
      const { data: result, error } = await query;
      
      if (error) throw error;
      return result;
    } catch (error) {
      console.error(`Supabase insertIntoTable error for ${tableName}:`, error);
      throw error;
    }
  }

  async updateTable(tableName, updates, filters = {}) {
    try {
      let query = this.client.from(tableName).update(updates);
      
      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
      
      const { data, error } = await query.select();
      
      if (error) throw error;
      return { changes: data ? data.length : 0 };
    } catch (error) {
      console.error(`Supabase updateTable error for ${tableName}:`, error);
      throw error;
    }
  }
}

// For production, use Supabase, for development use SQLite
export async function getDbConnection() {
  if (process.env.NODE_ENV === 'production' || process.env.USE_SUPABASE === 'true') {
    return new SupabaseWrapper();
  } else {
    // Fall back to SQLite for local development
    const { getDb } = await import('./db.js');
    return await getDb();
  }
} 