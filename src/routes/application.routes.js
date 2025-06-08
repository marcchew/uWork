import express from 'express';
import { getDb } from '../database/db.js';
import { checkAuthenticated, checkUserType } from '../middleware/auth.middleware.js';

const router = express.Router();

// View all applications (job seeker)
router.get('/', checkAuthenticated, checkUserType('seeker'), async (req, res) => {
  try {
    const db = await getDb();
    
    // Get seeker ID
    const seeker = await db.get('SELECT id FROM job_seekers WHERE user_id = ?', [req.session.user.id]);
    
    if (!seeker) {
      req.flash('error_msg', 'Profile not found');
      return res.redirect('/profile-setup');
    }
    
    // Get all applications
    const applications = await db.all(`
      SELECT a.*, j.title, j.location, c.company_name
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN companies c ON j.company_id = c.id
      WHERE a.job_seeker_id = ?
      ORDER BY a.created_at DESC
    `, [seeker.id]);
    
    res.render('applications/seeker-applications', {
      title: 'My Applications - uWork',
      applications
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    req.flash('error_msg', 'Error fetching applications');
    res.redirect('/dashboard');
  }
});

// View applications for a job (company)
router.get('/job/:id', checkAuthenticated, checkUserType('company'), async (req, res) => {
  try {
    const jobId = req.params.id;
    const db = await getDb();
    
    // Check if job belongs to company
    const company = await db.get('SELECT id FROM companies WHERE user_id = ?', [req.session.user.id]);
    
    if (!company) {
      req.flash('error_msg', 'Company profile not found');
      return res.redirect('/profile-setup');
    }
    
    const job = await db.get(`
      SELECT * FROM jobs 
      WHERE id = ? AND company_id = ?
    `, [jobId, company.id]);
    
    if (!job) {
      req.flash('error_msg', 'Job not found or does not belong to your company');
      return res.redirect('/dashboard');
    }
    
    // Get applications for this job
    const applications = await db.all(`
      SELECT a.*, s.full_name, s.skills, s.experience_years, s.location, 
             m.match_score, m.ai_reasoning
      FROM applications a
      JOIN job_seekers s ON a.job_seeker_id = s.id
      LEFT JOIN matches m ON (m.job_seeker_id = a.job_seeker_id AND m.job_id = a.job_id)
      WHERE a.job_id = ?
      ORDER BY a.created_at DESC
    `, [jobId]);
    
    res.render('applications/company-applications', {
      title: `Applications for ${job.title} - uWork`,
      job,
      applications
    });
  } catch (error) {
    console.error('Error fetching job applications:', error);
    req.flash('error_msg', 'Error fetching applications');
    res.redirect('/dashboard');
  }
});

// View application details (company)
router.get('/:id', checkAuthenticated, checkUserType('company'), async (req, res) => {
  try {
    const applicationId = req.params.id;
    const db = await getDb();
    
    // Get company ID
    const company = await db.get('SELECT id FROM companies WHERE user_id = ?', [req.session.user.id]);
    
    if (!company) {
      req.flash('error_msg', 'Company profile not found');
      return res.redirect('/profile-setup');
    }
    
    // Get application with job and seeker details
    const application = await db.get(`
      SELECT a.*, j.title, j.requirements, j.company_id,
             s.full_name, s.skills, s.experience_years, s.education, s.location,
             s.linkedin_url, s.portfolio_url, s.bio, s.resume_text,
             m.match_score, m.ai_reasoning
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN job_seekers s ON a.job_seeker_id = s.id
      LEFT JOIN matches m ON (m.job_seeker_id = a.job_seeker_id AND m.job_id = a.job_id)
      WHERE a.id = ? AND j.company_id = ?
    `, [applicationId, company.id]);
    
    if (!application) {
      req.flash('error_msg', 'Application not found or does not belong to your company');
      return res.redirect('/dashboard');
    }
    
    // Check if offer exists
    const offer = await db.get(`
      SELECT * FROM job_offers
      WHERE job_id = ? AND job_seeker_id = ?
    `, [application.job_id, application.job_seeker_id]);
    
    res.render('applications/application-details', {
      title: `Application Details - uWork`,
      application,
      offer
    });
  } catch (error) {
    console.error('Error fetching application details:', error);
    req.flash('error_msg', 'Error fetching application details');
    res.redirect('/dashboard');
  }
});

// Update application status (company)
router.post('/:id/status', checkAuthenticated, checkUserType('company'), async (req, res) => {
  try {
    const applicationId = req.params.id;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['pending', 'reviewing', 'interviewed', 'rejected', 'accepted'];
    if (!validStatuses.includes(status)) {
      req.flash('error_msg', 'Invalid status');
      return res.redirect(`/applications/${applicationId}`);
    }
    
    const db = await getDb();
    
    // Get company ID
    const company = await db.get('SELECT id FROM companies WHERE user_id = ?', [req.session.user.id]);
    
    if (!company) {
      req.flash('error_msg', 'Company profile not found');
      return res.redirect('/profile-setup');
    }
    
    // Check if application belongs to company
    const application = await db.get(`
      SELECT a.* FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.id = ? AND j.company_id = ?
    `, [applicationId, company.id]);
    
    if (!application) {
      req.flash('error_msg', 'Application not found or does not belong to your company');
      return res.redirect('/dashboard');
    }
    
    // Update status
    await db.run(
      'UPDATE applications SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, applicationId]
    );
    
    req.flash('success_msg', 'Application status updated');
    res.redirect(`/applications/${applicationId}`);
  } catch (error) {
    console.error('Error updating application status:', error);
    req.flash('error_msg', 'Error updating application status');
    res.redirect(`/applications/${req.params.id}`);
  }
});

export default router;