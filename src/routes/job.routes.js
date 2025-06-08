import express from 'express';
import { getDb } from '../database/db.js';
import { checkAuthenticated, checkUserType } from '../middleware/auth.middleware.js';
import { analyzeMatchWithAI } from '../utils/ai-service.js';

const router = express.Router();

// All jobs page
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    
    // Get all active jobs with company info
    const jobs = await db.all(`
      SELECT j.*, c.company_name, c.industry, c.location AS company_location
      FROM jobs j
      JOIN companies c ON j.company_id = c.id
      WHERE j.is_active = 1
      ORDER BY j.created_at DESC
    `);
    
    res.render('jobs/index', {
      title: 'Browse Jobs - uWork',
      jobs
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    req.flash('error_msg', 'Error fetching jobs');
    res.redirect('/');
  }
});

// Job details page
router.get('/:id', async (req, res) => {
  try {
    const jobId = req.params.id;
    const db = await getDb();
    
    // Get job with company info
    const job = await db.get(`
      SELECT j.*, c.company_name, c.industry, c.size, c.location AS company_location, c.website, c.description AS company_description
      FROM jobs j
      JOIN companies c ON j.company_id = c.id
      WHERE j.id = ?
    `, [jobId]);
    
    if (!job) {
      req.flash('error_msg', 'Job not found');
      return res.redirect('/jobs');
    }
    
    // Check if user has applied
    let hasApplied = false;
    let matchScore = null;
    
    if (req.session.user && req.session.user.user_type === 'seeker') {
      const seeker = await db.get('SELECT id FROM job_seekers WHERE user_id = ?', [req.session.user.id]);
      
      if (seeker) {
        const application = await db.get(
          'SELECT id FROM applications WHERE job_seeker_id = ? AND job_id = ?',
          [seeker.id, jobId]
        );
        
        hasApplied = !!application;
        
        // Get match score if available
        const match = await db.get(
          'SELECT match_score, ai_reasoning FROM matches WHERE job_seeker_id = ? AND job_id = ?',
          [seeker.id, jobId]
        );
        
        if (match) {
          matchScore = match;
        }
      }
    }
    
    res.render('jobs/details', {
      title: `${job.title} - uWork`,
      job,
      hasApplied,
      matchScore
    });
  } catch (error) {
    console.error('Error fetching job details:', error);
    req.flash('error_msg', 'Error fetching job details');
    res.redirect('/jobs');
  }
});

// Post job page
router.get('/post/new', checkAuthenticated, checkUserType('company'), async (req, res) => {
  res.render('jobs/post-job', {
    title: 'Post a Job - uWork'
  });
});

// Handle job posting
router.post('/post', checkAuthenticated, checkUserType('company'), async (req, res) => {
  try {
    const {
      title,
      description,
      requirements,
      salary_range,
      location,
      job_type,
      remote_option,
      experience_level,
      education_level
    } = req.body;
    
    // Validation
    if (!title || !description || !requirements) {
      req.flash('error_msg', 'Title, description, and requirements are required');
      return res.redirect('/jobs/post/new');
    }
    
    const db = await getDb();
    
    // Get company ID
    const company = await db.get('SELECT id FROM companies WHERE user_id = ?', [req.session.user.id]);
    
    if (!company) {
      req.flash('error_msg', 'Company profile not found');
      return res.redirect('/profile-setup');
    }
    
    // Insert job
    const result = await db.run(
      `INSERT INTO jobs (
        company_id, title, description, requirements, salary_range,
        location, job_type, remote_option, experience_level, education_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        company.id,
        title,
        description,
        requirements,
        salary_range || '',
        location || '',
        job_type || '',
        remote_option ? 1 : 0,
        experience_level || '',
        education_level || ''
      ]
    );
    
    const jobId = result.lastID;
    
    // Run AI matching for all job seekers
    runMatchingForJob(jobId);
    
    req.flash('success_msg', 'Job posted successfully');
    res.redirect(`/jobs/${jobId}`);
  } catch (error) {
    console.error('Error posting job:', error);
    req.flash('error_msg', 'Error posting job');
    res.redirect('/jobs/post/new');
  }
});

// Edit job page
router.get('/:id/edit', checkAuthenticated, checkUserType('company'), async (req, res) => {
  try {
    const jobId = req.params.id;
    const db = await getDb();
    
    // Get job
    const job = await db.get('SELECT * FROM jobs WHERE id = ?', [jobId]);
    
    if (!job) {
      req.flash('error_msg', 'Job not found');
      return res.redirect('/dashboard');
    }
    
    // Check if user owns this job
    const company = await db.get('SELECT id FROM companies WHERE user_id = ?', [req.session.user.id]);
    
    if (!company || job.company_id !== company.id) {
      req.flash('error_msg', 'You do not have permission to edit this job');
      return res.redirect('/dashboard');
    }
    
    res.render('jobs/edit-job', {
      title: `Edit Job: ${job.title} - uWork`,
      job
    });
  } catch (error) {
    console.error('Error fetching job for editing:', error);
    req.flash('error_msg', 'Error fetching job');
    res.redirect('/dashboard');
  }
});

// Handle job update
router.post('/:id/edit', checkAuthenticated, checkUserType('company'), async (req, res) => {
  try {
    const jobId = req.params.id;
    const {
      title,
      description,
      requirements,
      salary_range,
      location,
      job_type,
      remote_option,
      experience_level,
      education_level,
      is_active
    } = req.body;
    
    // Validation
    if (!title || !description || !requirements) {
      req.flash('error_msg', 'Title, description, and requirements are required');
      return res.redirect(`/jobs/${jobId}/edit`);
    }
    
    const db = await getDb();
    
    // Check if user owns this job
    const company = await db.get('SELECT id FROM companies WHERE user_id = ?', [req.session.user.id]);
    const job = await db.get('SELECT * FROM jobs WHERE id = ?', [jobId]);
    
    if (!company || !job || job.company_id !== company.id) {
      req.flash('error_msg', 'You do not have permission to edit this job');
      return res.redirect('/dashboard');
    }
    
    // Update job
    await db.run(
      `UPDATE jobs SET
        title = ?, description = ?, requirements = ?, salary_range = ?,
        location = ?, job_type = ?, remote_option = ?, experience_level = ?,
        education_level = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        title,
        description,
        requirements,
        salary_range || '',
        location || '',
        job_type || '',
        remote_option ? 1 : 0,
        experience_level || '',
        education_level || '',
        is_active ? 1 : 0,
        jobId
      ]
    );
    
    // Rerun AI matching if job was updated
    if (job.is_active) {
      runMatchingForJob(jobId);
    }
    
    req.flash('success_msg', 'Job updated successfully');
    res.redirect(`/jobs/${jobId}`);
  } catch (error) {
    console.error('Error updating job:', error);
    req.flash('error_msg', 'Error updating job');
    res.redirect(`/jobs/${req.params.id}/edit`);
  }
});

/**
 * Run AI matching for a job against all job seekers
 * @param {number} jobId - The job ID to run matching for
 */
async function runMatchingForJob(jobId) {
  try {
    const db = await getDb();
    
    // Get job data
    const job = await db.get('SELECT * FROM jobs WHERE id = ?', [jobId]);
    
    if (!job) {
      console.error(`Job ${jobId} not found for matching`);
      return;
    }
    
    // Get all job seekers
    const seekers = await db.all('SELECT * FROM job_seekers');
    
    // Run matching for each seeker
    for (const seeker of seekers) {
      try {
        // Skip if no resume or skills
        if (!seeker.resume_text && !seeker.skills) {
          continue;
        }
        
        // Run AI matching
        const matchResult = await analyzeMatchWithAI(seeker, job);
        
        // Check if match already exists
        const existingMatch = await db.get(
          'SELECT id FROM matches WHERE job_seeker_id = ? AND job_id = ?',
          [seeker.id, jobId]
        );
        
        if (existingMatch) {
          // Update existing match
          await db.run(
            'UPDATE matches SET match_score = ?, ai_reasoning = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?',
            [matchResult.match_score, matchResult.reasoning, existingMatch.id]
          );
        } else {
          // Insert new match
          await db.run(
            'INSERT INTO matches (job_seeker_id, job_id, match_score, ai_reasoning) VALUES (?, ?, ?, ?)',
            [seeker.id, jobId, matchResult.match_score, matchResult.reasoning]
          );
        }
      } catch (error) {
        console.error(`Error matching job ${jobId} with seeker ${seeker.id}:`, error);
      }
    }
  } catch (error) {
    console.error(`Error running matching for job ${jobId}:`, error);
  }
}

export default router;