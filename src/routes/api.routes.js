import express from 'express';
import { getDb } from '../database/db.js';
import { checkAuthenticated, checkUserType } from '../middleware/auth.middleware.js';
import { analyzeMatchWithAI, generateCareerAdvice } from '../utils/ai-service.js';

const router = express.Router();

// API health check
router.get('/test', (req, res) => {
  res.json({ status: 'ok', message: 'API is working' });
});

// Apply for a job
router.post('/apply-job/:id', checkAuthenticated, checkUserType('seeker'), async (req, res) => {
  try {
    const jobId = req.params.id;
    const { coverLetter } = req.body;
    
    const db = await getDb();
    
    // Get seeker ID
    const seeker = await db.get('SELECT id FROM job_seekers WHERE user_id = ?', [req.session.user.id]);
    
    if (!seeker) {
      return res.status(400).json({ success: false, message: 'Profile not found' });
    }
    
    // Check if job exists and is active
    const job = await db.get('SELECT * FROM jobs WHERE id = ? AND is_active = 1', [jobId]);
    
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found or inactive' });
    }
    
    // Check if already applied
    const existingApplication = await db.get(
      'SELECT id FROM applications WHERE job_seeker_id = ? AND job_id = ?',
      [seeker.id, jobId]
    );
    
    if (existingApplication) {
      return res.status(400).json({ success: false, message: 'You have already applied for this job' });
    }
    
    // Insert application
    await db.run(
      'INSERT INTO applications (job_seeker_id, job_id, cover_letter) VALUES (?, ?, ?)',
      [seeker.id, jobId, coverLetter || '']
    );
    
    return res.json({ success: true, message: 'Application submitted successfully' });
  } catch (error) {
    console.error('Error applying for job:', error);
    return res.status(500).json({ success: false, message: 'Error applying for job' });
  }
});

// Check application status
router.get('/check-application/:id', checkAuthenticated, checkUserType('seeker'), async (req, res) => {
  try {
    const jobId = req.params.id;
    const db = await getDb();
    
    // Get seeker ID
    const seeker = await db.get('SELECT id FROM job_seekers WHERE user_id = ?', [req.session.user.id]);
    
    if (!seeker) {
      return res.status(400).json({ success: false, message: 'Profile not found' });
    }
    
    // Check application
    const application = await db.get(
      'SELECT id, status, created_at FROM applications WHERE job_seeker_id = ? AND job_id = ?',
      [seeker.id, jobId]
    );
    
    if (!application) {
      return res.json({ success: true, applied: false });
    }
    
    return res.json({
      success: true,
      applied: true,
      application: {
        id: application.id,
        status: application.status,
        created_at: application.created_at
      }
    });
  } catch (error) {
    console.error('Error checking application:', error);
    return res.status(500).json({ success: false, message: 'Error checking application' });
  }
});

// Run AI matching for a job
router.post('/run-matching/:jobId', checkAuthenticated, checkUserType('company'), async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const db = await getDb();
    
    // Get company ID
    const company = await db.get('SELECT id FROM companies WHERE user_id = ?', [req.session.user.id]);
    
    if (!company) {
      return res.status(400).json({ success: false, message: 'Company profile not found' });
    }
    
    // Check if job belongs to company
    const job = await db.get('SELECT * FROM jobs WHERE id = ? AND company_id = ?', [jobId, company.id]);
    
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found or does not belong to your company' });
    }
    
    // Get all job seekers
    const seekers = await db.all('SELECT * FROM job_seekers');
    
    // Run matching asynchronously
    res.json({ success: true, message: 'Matching process started', jobId });
    
    // Process each seeker
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
    console.error('Error running matching:', error);
    return res.status(500).json({ success: false, message: 'Error running matching' });
  }
});

// Save/unsave a job
router.post('/save-job/:id', checkAuthenticated, checkUserType('seeker'), async (req, res) => {
  try {
    const jobId = req.params.id;
    const db = await getDb();
    
    // Get seeker ID
    const seeker = await db.get('SELECT id FROM job_seekers WHERE user_id = ?', [req.session.user.id]);
    
    if (!seeker) {
      return res.status(400).json({ success: false, message: 'Profile not found' });
    }
    
    // Check if job exists
    const job = await db.get('SELECT * FROM jobs WHERE id = ?', [jobId]);
    
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    
    // Check if already saved
    const savedJob = await db.get(
      'SELECT id FROM saved_jobs WHERE job_seeker_id = ? AND job_id = ?',
      [seeker.id, jobId]
    );
    
    if (savedJob) {
      // Unsave
      await db.run('DELETE FROM saved_jobs WHERE id = ?', [savedJob.id]);
      return res.json({ success: true, saved: false, message: 'Job removed from saved jobs' });
    } else {
      // Save
      await db.run(
        'INSERT INTO saved_jobs (job_seeker_id, job_id) VALUES (?, ?)',
        [seeker.id, jobId]
      );
      return res.json({ success: true, saved: true, message: 'Job saved successfully' });
    }
  } catch (error) {
    console.error('Error saving/unsaving job:', error);
    return res.status(500).json({ success: false, message: 'Error saving/unsaving job' });
  }
});

// Save/unsave a candidate
router.post('/save-candidate/:id', checkAuthenticated, checkUserType('company'), async (req, res) => {
  try {
    const seekerId = req.params.id;
    const db = await getDb();
    
    // Get company ID
    const company = await db.get('SELECT id FROM companies WHERE user_id = ?', [req.session.user.id]);
    
    if (!company) {
      return res.status(400).json({ success: false, message: 'Company profile not found' });
    }
    
    // Check if job seeker exists
    const seeker = await db.get('SELECT * FROM job_seekers WHERE id = ?', [seekerId]);
    
    if (!seeker) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }
    
    // Check if already saved
    const savedCandidate = await db.get(
      'SELECT id FROM saved_candidates WHERE company_id = ? AND job_seeker_id = ?',
      [company.id, seekerId]
    );
    
    if (savedCandidate) {
      // Unsave
      await db.run('DELETE FROM saved_candidates WHERE id = ?', [savedCandidate.id]);
      return res.json({ success: true, saved: false, message: 'Candidate removed from saved list' });
    } else {
      // Save
      await db.run(
        'INSERT INTO saved_candidates (company_id, job_seeker_id) VALUES (?, ?)',
        [company.id, seekerId]
      );
      return res.json({ success: true, saved: true, message: 'Candidate saved successfully' });
    }
  } catch (error) {
    console.error('Error saving/unsaving candidate:', error);
    return res.status(500).json({ success: false, message: 'Error saving/unsaving candidate' });
  }
});

// Make a job offer
router.post('/offer-job/:seekerId/:jobId', checkAuthenticated, checkUserType('company'), async (req, res) => {
  try {
    const { seekerId, jobId } = req.params;
    const { offerMessage, salaryOffered } = req.body;
    
    const db = await getDb();
    
    // Get company ID
    const company = await db.get('SELECT id FROM companies WHERE user_id = ?', [req.session.user.id]);
    
    if (!company) {
      return res.status(400).json({ success: false, message: 'Company profile not found' });
    }
    
    // Check if job belongs to company
    const job = await db.get('SELECT * FROM jobs WHERE id = ? AND company_id = ?', [jobId, company.id]);
    
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found or does not belong to your company' });
    }
    
    // Check if job seeker exists
    const seeker = await db.get('SELECT * FROM job_seekers WHERE id = ?', [seekerId]);
    
    if (!seeker) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }
    
    // Check if offer already exists
    const existingOffer = await db.get(
      'SELECT * FROM job_offers WHERE job_id = ? AND job_seeker_id = ?',
      [jobId, seekerId]
    );
    
    if (existingOffer) {
      if (existingOffer.status === 'pending') {
        return res.status(400).json({ success: false, message: 'An offer is already pending for this candidate' });
      }
      
      // Update existing offer
      await db.run(
        `UPDATE job_offers SET 
          offer_message = ?, salary_offered = ?, status = 'pending', 
          updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?`,
        [offerMessage || '', salaryOffered || '', existingOffer.id]
      );
    } else {
      // Create new offer
      await db.run(
        'INSERT INTO job_offers (job_id, job_seeker_id, offer_message, salary_offered) VALUES (?, ?, ?, ?)',
        [jobId, seekerId, offerMessage || '', salaryOffered || '']
      );
    }
    
    return res.json({ success: true, message: 'Job offer sent successfully' });
  } catch (error) {
    console.error('Error sending job offer:', error);
    return res.status(500).json({ success: false, message: 'Error sending job offer' });
  }
});

// Respond to job offer
router.post('/respond-offer/:id', checkAuthenticated, checkUserType('seeker'), async (req, res) => {
  try {
    const offerId = req.params.id;
    const { response } = req.body;
    
    // Validate response
    if (!['accepted', 'declined'].includes(response)) {
      return res.status(400).json({ success: false, message: 'Invalid response' });
    }
    
    const db = await getDb();
    
    // Get seeker ID
    const seeker = await db.get('SELECT id FROM job_seekers WHERE user_id = ?', [req.session.user.id]);
    
    if (!seeker) {
      return res.status(400).json({ success: false, message: 'Profile not found' });
    }
    
    // Check if offer exists and belongs to seeker
    const offer = await db.get(
      'SELECT * FROM job_offers WHERE id = ? AND job_seeker_id = ? AND status = "pending"',
      [offerId, seeker.id]
    );
    
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found or already responded to' });
    }
    
    // Update offer status
    await db.run(
      'UPDATE job_offers SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [response, offerId]
    );
    
    // If accepted, update application status
    if (response === 'accepted') {
      await db.run(
        `UPDATE applications SET 
          status = 'accepted', updated_at = CURRENT_TIMESTAMP 
        WHERE job_seeker_id = ? AND job_id = ?`,
        [seeker.id, offer.job_id]
      );
    }
    
    return res.json({ success: true, message: `Offer ${response} successfully` });
  } catch (error) {
    console.error('Error responding to job offer:', error);
    return res.status(500).json({ success: false, message: 'Error responding to job offer' });
  }
});

// Withdraw job offer
router.post('/withdraw-offer/:id', checkAuthenticated, checkUserType('company'), async (req, res) => {
  try {
    const offerId = req.params.id;
    const db = await getDb();
    
    // Get company ID
    const company = await db.get('SELECT id FROM companies WHERE user_id = ?', [req.session.user.id]);
    
    if (!company) {
      return res.status(400).json({ success: false, message: 'Company profile not found' });
    }
    
    // Check if offer exists and belongs to company
    const offer = await db.get(`
      SELECT o.* FROM job_offers o
      JOIN jobs j ON o.job_id = j.id
      WHERE o.id = ? AND j.company_id = ? AND o.status = 'pending'
    `, [offerId, company.id]);
    
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found or cannot be withdrawn' });
    }
    
    // Update offer status
    await db.run(
      'UPDATE job_offers SET status = "withdrawn", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [offerId]
    );
    
    return res.json({ success: true, message: 'Offer withdrawn successfully' });
  } catch (error) {
    console.error('Error withdrawing job offer:', error);
    return res.status(500).json({ success: false, message: 'Error withdrawing job offer' });
  }
});

// Get AI career advice
router.post('/get-advice', checkAuthenticated, checkUserType('seeker'), async (req, res) => {
  try {
    const { category, question } = req.body;
    
    // Validate
    if (!category || !question) {
      return res.status(400).json({ success: false, message: 'Category and question are required' });
    }
    
    const db = await getDb();
    
    // Get seeker data
    const seeker = await db.get('SELECT * FROM job_seekers WHERE user_id = ?', [req.session.user.id]);
    
    if (!seeker) {
      return res.status(400).json({ success: false, message: 'Profile not found' });
    }
    
    // Get advice from AI
    const advice = await generateCareerAdvice(seeker, category, question);
    
    return res.json({ success: true, advice });
  } catch (error) {
    console.error('Error generating career advice:', error);
    return res.status(500).json({ success: false, message: 'Error generating career advice' });
  }
});

export default router;