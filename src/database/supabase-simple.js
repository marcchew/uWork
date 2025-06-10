import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

let supabase;

function getSupabaseClient() {
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

// Simple wrapper that works with existing code patterns
export class SupabaseSimpleWrapper {
  constructor() {
    this.client = getSupabaseClient();
  }

  async get(query, params = []) {
    // Convert common SELECT queries to Supabase calls
    if (query.includes('SELECT') && query.includes('FROM users WHERE email = ?')) {
      const [email] = params;
      const { data, error } = await this.client
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
    
    if (query.includes('SELECT') && query.includes('FROM job_seekers WHERE user_id = ?')) {
      const [userId] = params;
      const { data, error } = await this.client
        .from('job_seekers')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }
    
    if (query.includes('SELECT') && query.includes('FROM companies WHERE user_id = ?')) {
      const [userId] = params;
      const { data, error } = await this.client
        .from('companies')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    }

    // Job details query
    if (query.includes('FROM jobs j JOIN companies c') && query.includes('WHERE j.id = ?')) {
      const [jobId] = params;
      const { data, error } = await this.client
        .from('jobs')
        .select(`
          *,
          companies!jobs_company_id_fkey (
            company_name,
            industry,
            size,
            location,
            website,
            description
          )
        `)
        .eq('id', jobId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data && data.companies) {
        // Flatten the data structure to match expected format
        const company = data.companies;
        return {
          ...data,
          company_name: company.company_name,
          industry: company.industry,
          size: company.size,
          company_location: company.location,
          website: company.website,
          company_description: company.description
        };
      }
      
      return data;
    }
    
    // For other queries, you might need to add more specific handlers
    console.warn('Unhandled SELECT query:', query.substring(0, 100) + '...');
    return null;
  }

  async all(query, params = []) {
    // Handle jobs listing with filters
    if (query.includes('FROM jobs j JOIN companies c') && query.includes('WHERE j.is_active = 1')) {
      let queryBuilder = this.client
        .from('jobs')
        .select(`
          *,
          companies!jobs_company_id_fkey (
            company_name,
            industry,
            location
          )
        `)
        .eq('is_active', true);

      // Add filters based on params (this is simplified - you'd need to parse the query better)
      const { data, error } = await queryBuilder.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Flatten the data structure
      return (data || []).map(job => ({
        ...job,
        company_name: job.companies?.company_name,
        industry: job.companies?.industry,
        company_location: job.companies?.location
      }));
    }
    
    // Handle matches query
    if (query.includes('FROM matches m JOIN jobs j') && query.includes('job_seeker_id = ?')) {
      const [seekerId] = params;
      const { data, error } = await this.client
        .from('matches')
        .select(`
          *,
          jobs!matches_job_id_fkey (
            title,
            location,
            salary_range,
            remote_option,
            job_type,
            companies!jobs_company_id_fkey (
              company_name,
              industry
            )
          )
        `)
        .eq('job_seeker_id', seekerId)
        .order('match_score', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      // Flatten the data structure
      return (data || []).map(match => ({
        ...match,
        title: match.jobs?.title,
        location: match.jobs?.location,
        salary_range: match.jobs?.salary_range,
        remote_option: match.jobs?.remote_option,
        job_type: match.jobs?.job_type,
        company_name: match.jobs?.companies?.company_name,
        industry: match.jobs?.companies?.industry
      }));
    }
    
    console.warn('Unhandled SELECT ALL query:', query.substring(0, 100) + '...');
    return [];
  }

  async run(query, params = []) {
    // Handle INSERT for users
    if (query.includes('INSERT INTO users')) {
      const [username, email, password_hash, user_type] = params;
      const { data, error } = await this.client
        .from('users')
        .insert({ username, email, password_hash, user_type })
        .select('id')
        .single();
      
      if (error) throw error;
      return { lastID: data.id, changes: 1 };
    }
    
    // Handle INSERT for job_seekers
    if (query.includes('INSERT INTO job_seekers')) {
      const insertData = this.parseInsertParams(query, params);
      const { data, error } = await this.client
        .from('job_seekers')
        .insert(insertData)
        .select('id')
        .single();
      
      if (error) throw error;
      return { lastID: data.id, changes: 1 };
    }
    
    // Handle UPDATE for job_seekers
    if (query.includes('UPDATE job_seekers SET') && query.includes('WHERE user_id = ?')) {
      const userId = params[params.length - 1]; // Last parameter is usually the user_id
      const updateData = this.parseUpdateParams(query, params.slice(0, -1));
      
      const { data, error } = await this.client
        .from('job_seekers')
        .update(updateData)
        .eq('user_id', userId)
        .select('id');
      
      if (error) throw error;
      return { changes: data ? data.length : 0 };
    }
    
    console.warn('Unhandled RUN query:', query.substring(0, 100) + '...');
    return { lastID: null, changes: 0 };
  }

  async exec(query) {
    // For CREATE TABLE and other DDL operations, these should be run directly in Supabase
    console.warn('DDL operations should be run directly in Supabase dashboard:', query.substring(0, 100) + '...');
    return Promise.resolve();
  }

  async close() {
    return Promise.resolve();
  }

  // Helper methods
  parseInsertParams(query, params) {
    // This is a simplified parser - you'd want to make this more robust
    if (query.includes('job_seekers')) {
      return {
        user_id: params[0],
        // Add other fields as needed based on your INSERT queries
      };
    }
    return {};
  }

  parseUpdateParams(query, params) {
    // This is a simplified parser - you'd want to make this more robust
    // Extract field names from the query and map to params
    const updateData = {};
    
    if (query.includes('full_name = ?')) updateData.full_name = params[0];
    if (query.includes('resume_text = COALESCE(?, resume_text)')) updateData.resume_text = params[1];
    // Add more field mappings as needed
    
    return updateData;
  }
}

export async function getDbConnection() {
  if (process.env.NODE_ENV === 'production' || process.env.USE_SUPABASE === 'true') {
    return new SupabaseSimpleWrapper();
  } else {
    const { getDb } = await import('./db.js');
    return await getDb();
  }
} 