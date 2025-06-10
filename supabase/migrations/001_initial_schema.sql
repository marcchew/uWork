-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('seeker', 'company')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create job_seekers table
CREATE TABLE IF NOT EXISTS job_seekers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL,
  full_name TEXT,
  resume_text TEXT,
  skills TEXT,
  experience_years INTEGER,
  education TEXT,
  location TEXT,
  phone TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  bio TEXT,
  priorities TEXT, -- JSON string with priority values
  preferred_job_types TEXT, -- JSON string with preferred job types array
  remote_work_preference BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_job_seekers_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  industry TEXT,
  size TEXT,
  location TEXT,
  website TEXT,
  description TEXT,
  founded_year INTEGER,
  logo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_companies_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create jobs table
CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT NOT NULL,
  salary_range TEXT,
  location TEXT,
  job_type TEXT, -- full-time, part-time, contract, etc.
  remote_option BOOLEAN DEFAULT FALSE,
  experience_level TEXT,
  education_level TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_jobs_company_id FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  job_seeker_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  match_score INTEGER NOT NULL, -- 0-100
  ai_reasoning TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_matches_job_seeker_id FOREIGN KEY (job_seeker_id) REFERENCES job_seekers(id) ON DELETE CASCADE,
  CONSTRAINT fk_matches_job_id FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  job_seeker_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  cover_letter TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'interviewed', 'rejected', 'accepted')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_applications_job_seeker_id FOREIGN KEY (job_seeker_id) REFERENCES job_seekers(id) ON DELETE CASCADE,
  CONSTRAINT fk_applications_job_id FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Create job_offers table
CREATE TABLE IF NOT EXISTS job_offers (
  id SERIAL PRIMARY KEY,
  job_id INTEGER NOT NULL,
  job_seeker_id INTEGER NOT NULL,
  offer_message TEXT,
  salary_offered TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_job_offers_job_id FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
  CONSTRAINT fk_job_offers_job_seeker_id FOREIGN KEY (job_seeker_id) REFERENCES job_seekers(id) ON DELETE CASCADE
);

-- Create saved_jobs table
CREATE TABLE IF NOT EXISTS saved_jobs (
  id SERIAL PRIMARY KEY,
  job_seeker_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_saved_jobs_job_seeker_id FOREIGN KEY (job_seeker_id) REFERENCES job_seekers(id) ON DELETE CASCADE,
  CONSTRAINT fk_saved_jobs_job_id FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- Create saved_candidates table
CREATE TABLE IF NOT EXISTS saved_candidates (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  job_seeker_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_saved_candidates_company_id FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_saved_candidates_job_seeker_id FOREIGN KEY (job_seeker_id) REFERENCES job_seekers(id) ON DELETE CASCADE
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_messages_sender_id FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_receiver_id FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_job_seekers_user_id ON job_seekers(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_job_type ON jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_jobs_remote_option ON jobs(remote_option);
CREATE INDEX IF NOT EXISTS idx_jobs_is_active ON jobs(is_active);
CREATE INDEX IF NOT EXISTS idx_matches_job_seeker_id ON matches(job_seeker_id);
CREATE INDEX IF NOT EXISTS idx_matches_job_id ON matches(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_seeker_id ON applications(job_seeker_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);

-- Create RPC functions for SQL execution (needed for compatibility with existing code)
CREATE OR REPLACE FUNCTION execute_sql(query_text TEXT, query_params TEXT[] DEFAULT '{}')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- This is a simplified version. In production, you'd want to be more careful about SQL injection
  -- and limit what queries can be executed
  EXECUTE query_text INTO result USING query_params;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION execute_sql_with_return(query_text TEXT, query_params TEXT[] DEFAULT '{}')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  EXECUTE query_text INTO result USING query_params;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION execute_ddl(query_text TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query_text;
END;
$$;

-- Enable Row Level Security (RLS) for better security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_seekers ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (you can make these more restrictive based on your needs)
CREATE POLICY "Public access for users" ON users FOR ALL USING (true);
CREATE POLICY "Public access for job_seekers" ON job_seekers FOR ALL USING (true);
CREATE POLICY "Public access for companies" ON companies FOR ALL USING (true);
CREATE POLICY "Public access for jobs" ON jobs FOR ALL USING (true);
CREATE POLICY "Public access for matches" ON matches FOR ALL USING (true);
CREATE POLICY "Public access for applications" ON applications FOR ALL USING (true);
CREATE POLICY "Public access for job_offers" ON job_offers FOR ALL USING (true);
CREATE POLICY "Public access for saved_jobs" ON saved_jobs FOR ALL USING (true);
CREATE POLICY "Public access for saved_candidates" ON saved_candidates FOR ALL USING (true);
CREATE POLICY "Public access for messages" ON messages FOR ALL USING (true); 