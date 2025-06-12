import express from 'express';
import { getDbConnection } from '../database/db.js';
import { checkAuthenticated, checkUserType } from '../middleware/auth.middleware.js';
import { upload } from '../middleware/upload.middleware.js';
import { parseResume, extractSkills } from '../utils/resume-parser.js';

const router = express.Router();

// Profile setup page
router.get('/profile-setup', checkAuthenticated, async (req, res) => {
  try {
    const userType = req.session.user.user_type;
    
    // Get existing profile data if any
    const db = await getDbConnection();
    let profileData = null;
    
    if (userType === 'seeker') {
      profileData = await db.get('SELECT * FROM job_seekers WHERE user_id = ?', [req.session.user.id]);
      // Parse job type preferences if they exist
      if (profileData && profileData.preferred_job_types) {
        try {
          profileData.preferred_job_types = JSON.parse(profileData.preferred_job_types);
        } catch (e) {
          profileData.preferred_job_types = [];
        }
      }
    } else if (userType === 'company') {
      profileData = await db.get('SELECT * FROM companies WHERE user_id = ?', [req.session.user.id]);
    }
    
    res.render('profile/profile-setup', {
      title: 'Profile Setup - uWork',
      userType,
      profileData
    });
  } catch (error) {
    console.error('Error loading profile setup:', error);
    req.flash('error_msg', 'Error loading profile setup');
    res.redirect('/dashboard');
  }
});

// Handle job seeker profile setup
router.post('/profile-setup/seeker', checkAuthenticated, checkUserType('seeker'), upload.single('resume'), async (req, res) => {
  try {
    const {
      full_name,
      experience_years,
      education,
      location,
      phone,
      linkedin_url,
      portfolio_url,
      bio,
      preferred_job_types,
      remote_work_preference
    } = req.body;
    
    const db = await getDbConnection();
    
    // Process resume file if uploaded
    let resumeText = '';
    let skills = [];
    
    if (req.file) {
      try {
        resumeText = await parseResume(req.file.path);
        skills = await extractSkills(resumeText);
      } catch (error) {
        console.error('Error parsing resume:', error);
        req.flash('error_msg', 'Error parsing resume file');
      }
    }
    
    // Process job type preferences
    const jobTypePrefs = Array.isArray(preferred_job_types) ? preferred_job_types : (preferred_job_types ? [preferred_job_types] : []);
    
    // Update profile
    await db.run(
      `UPDATE job_seekers SET
        full_name = ?,
        resume_text = COALESCE(?, resume_text),
        skills = COALESCE(?, skills),
        experience_years = ?,
        education = ?,
        location = ?,
        phone = ?,
        linkedin_url = ?,
        portfolio_url = ?,
        bio = ?,
        preferred_job_types = ?,
        remote_work_preference = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?`,
      [
        full_name,
        resumeText || null,
        skills.length > 0 ? skills.join(', ') : null,
        experience_years || 0,
        education || '',
        location || '',
        phone || '',
        linkedin_url || '',
        portfolio_url || '',
        bio || '',
        JSON.stringify(jobTypePrefs),
        remote_work_preference ? 1 : 0,
        req.session.user.id
      ]
    );
    
    // Update session
    req.session.user.profile_completed = true;
    
    req.flash('success_msg', 'Profile updated successfully');
    res.redirect('/profile/update-priorities');
  } catch (error) {
    console.error('Error updating job seeker profile:', error);
    req.flash('error_msg', 'Error updating profile');
    res.redirect('/profile-setup');
  }
});

// Handle company profile setup
router.post('/profile-setup/company', checkAuthenticated, checkUserType('company'), async (req, res) => {
  try {
    const {
      company_name,
      industry,
      size,
      location,
      website,
      description,
      founded_year
    } = req.body;
    
    const db = await getDbConnection();
    
    // Update profile
    await db.run(
      `UPDATE companies SET
        company_name = ?,
        industry = ?,
        size = ?,
        location = ?,
        website = ?,
        description = ?,
        founded_year = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?`,
      [
        company_name,
        industry || '',
        size || '',
        location || '',
        website || '',
        description || '',
        founded_year || null,
        req.session.user.id
      ]
    );
    
    // Update session
    req.session.user.profile_completed = true;
    
    req.flash('success_msg', 'Company profile updated successfully');
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error updating company profile:', error);
    req.flash('error_msg', 'Error updating company profile');
    res.redirect('/profile-setup');
  }
});

// Update priorities page
router.get('/update-priorities', checkAuthenticated, checkUserType('seeker'), async (req, res) => {
  try {
    const db = await getDbConnection();
    const seeker = await db.get('SELECT * FROM job_seekers WHERE user_id = ?', [req.session.user.id]);
    
    // Parse priorities if they exist
    let priorities = {};
    if (seeker && seeker.priorities) {
      try {
        priorities = JSON.parse(seeker.priorities);
      } catch (error) {
        console.error('Error parsing priorities:', error);
      }
    }
    
    res.render('profile/update-priorities', {
      title: 'Update Priorities - uWork',
      priorities
    });
  } catch (error) {
    console.error('Error loading priorities:', error);
    req.flash('error_msg', 'Error loading priorities');
    res.redirect('/dashboard');
  }
});

// Handle priorities update
router.post('/update-priorities', checkAuthenticated, checkUserType('seeker'), async (req, res) => {
  try {
    const {
      salary,
      work_life_balance,
      remote_work,
      career_growth,
      company_culture,
      job_security,
      location,
      benefits,
      company_reputation,
      job_satisfaction
    } = req.body;
    
    // Create priorities object
    const priorities = {
      salary: parseInt(salary) || 3,
      work_life_balance: parseInt(work_life_balance) || 3,
      remote_work: parseInt(remote_work) || 3,
      career_growth: parseInt(career_growth) || 3,
      company_culture: parseInt(company_culture) || 3,
      job_security: parseInt(job_security) || 3,
      location: parseInt(location) || 3,
      benefits: parseInt(benefits) || 3,
      company_reputation: parseInt(company_reputation) || 3,
      job_satisfaction: parseInt(job_satisfaction) || 3
    };
    
    const db = await getDbConnection();
    
    // Update priorities
    await db.run(
      'UPDATE job_seekers SET priorities = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [JSON.stringify(priorities), req.session.user.id]
    );
    
    req.flash('success_msg', 'Priorities updated successfully');
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error updating priorities:', error);
    req.flash('error_msg', 'Error updating priorities');
    res.redirect('/profile/update-priorities');
  }
});

export default router;
