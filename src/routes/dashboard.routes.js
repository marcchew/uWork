import express from 'express';
import { getDbConnection } from '../database/db.js';
import { checkAuthenticated, checkUserType } from '../middleware/auth.middleware.js';

const router = express.Router();

// Dashboard home
router.get('/', checkAuthenticated, async (req, res) => {
  try {
    const userType = req.session.user.user_type;
    
    if (userType === 'seeker') {
      await getSeekerDashboard(req, res);
    } else if (userType === 'company') {
      await getCompanyDashboard(req, res);
    } else {
      req.flash('error_msg', 'Invalid user type');
      res.redirect('/logout');
    }
  } catch (error) {
    console.error('Error loading dashboard:', error);
    req.flash('error_msg', 'Error loading dashboard');
    res.redirect('/');
  }
});

/**
 * Get job seeker dashboard data and render
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getSeekerDashboard(req, res) {
  const db = await getDbConnection();
  
  // Get seeker profile
  const seeker = await db.get('SELECT * FROM job_seekers WHERE user_id = ?', [req.session.user.id]);
  
  if (!seeker) {
    req.flash('error_msg', 'Profile not found');
    return res.redirect('/profile-setup');
  }

  // Parse job type preferences
  let preferredJobTypes = [];
  if (seeker.preferred_job_types) {
    try {
      preferredJobTypes = JSON.parse(seeker.preferred_job_types);
    } catch (e) {
      preferredJobTypes = [];
    }
  }
  
  // Get top matches
  const matches = await db.all(`
    SELECT m.*, j.title, j.location, j.salary_range, j.remote_option, j.job_type,
           c.company_name, c.industry
    FROM matches m
    JOIN jobs j ON m.job_id = j.id
    JOIN companies c ON j.company_id = c.id
    WHERE m.job_seeker_id = ? AND j.is_active = 1
    ORDER BY m.match_score DESC
    LIMIT 10
  `, [seeker.id]);

  // Get personalized job recommendations based on preferences
  let recommendedJobs = [];
  if (preferredJobTypes.length > 0) {
    const placeholders = preferredJobTypes.map(() => '?').join(',');
    recommendedJobs = await db.all(`
      SELECT j.*, c.company_name, c.industry, c.location AS company_location
      FROM jobs j
      JOIN companies c ON j.company_id = c.id
      WHERE j.is_active = 1 
        AND j.job_type IN (${placeholders})
        ${seeker.remote_work_preference ? 'AND j.remote_option = 1' : ''}
        AND j.id NOT IN (
          SELECT job_id FROM applications WHERE job_seeker_id = ?
        )
      ORDER BY j.created_at DESC
      LIMIT 8
    `, [...preferredJobTypes, seeker.id]);
  }
  
  // Get recent applications
  const applications = await db.all(`
    SELECT a.*, j.title, j.location, c.company_name
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    JOIN companies c ON j.company_id = c.id
    WHERE a.job_seeker_id = ?
    ORDER BY a.created_at DESC
    LIMIT 5
  `, [seeker.id]);
  
  // Get job offers
  const offers = await db.all(`
    SELECT o.*, j.title, c.company_name
    FROM job_offers o
    JOIN jobs j ON o.job_id = j.id
    JOIN companies c ON j.company_id = c.id
    WHERE o.job_seeker_id = ? AND o.status = 'pending'
    ORDER BY o.created_at DESC
  `, [seeker.id]);
  
  // Get saved jobs
  const savedJobs = await db.all(`
    SELECT s.*, j.title, j.location, j.salary_range, c.company_name
    FROM saved_jobs s
    JOIN jobs j ON s.job_id = j.id
    JOIN companies c ON j.company_id = c.id
    WHERE s.job_seeker_id = ? AND j.is_active = 1
    ORDER BY s.created_at DESC
  `, [seeker.id]);
  
  // Render dashboard
  res.render('dashboard/seeker', {
    title: 'Dashboard - uWork',
    seeker,
    matches,
    applications,
    offers,
    savedJobs,
    recommendedJobs,
    preferredJobTypes
  });
}

/**
 * Get company dashboard data and render
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getCompanyDashboard(req, res) {
  const db = await getDbConnection();
  
  // Get company profile
  const company = await db.get('SELECT * FROM companies WHERE user_id = ?', [req.session.user.id]);
  
  if (!company) {
    req.flash('error_msg', 'Company profile not found');
    return res.redirect('/profile-setup');
  }
  
  // Get posted jobs
  const jobs = await db.all(`
    SELECT j.*, 
           (SELECT COUNT(*) FROM applications WHERE job_id = j.id) AS application_count
    FROM jobs j
    WHERE j.company_id = ?
    ORDER BY j.created_at DESC
  `, [company.id]);
  
  // Get recent applications
  const applications = await db.all(`
    SELECT a.*, j.title, s.full_name AS seeker_name
    FROM applications a
    JOIN jobs j ON a.job_id = j.id
    JOIN job_seekers s ON a.job_seeker_id = s.id
    WHERE j.company_id = ?
    ORDER BY a.created_at DESC
    LIMIT 10
  `, [company.id]);
  
  // Get pending offers
  const offers = await db.all(`
    SELECT o.*, j.title, s.full_name AS seeker_name
    FROM job_offers o
    JOIN jobs j ON o.job_id = j.id
    JOIN job_seekers s ON o.job_seeker_id = s.id
    WHERE j.company_id = ? AND o.status = 'pending'
    ORDER BY o.created_at DESC
  `, [company.id]);
  
  // Get saved candidates
  const savedCandidates = await db.all(`
    SELECT sc.*, s.full_name, s.skills, s.experience_years
    FROM saved_candidates sc
    JOIN job_seekers s ON sc.job_seeker_id = s.id
    WHERE sc.company_id = ?
    ORDER BY sc.created_at DESC
  `, [company.id]);
  
  // Render dashboard
  res.render('dashboard/company', {
    title: 'Company Dashboard - uWork',
    company,
    jobs,
    applications,
    offers,
    savedCandidates
  });
}

export default router;
