import express from 'express';
import { getDb } from '../database/db.js';
import { checkAuthenticated, checkUserType } from '../middleware/auth.middleware.js';

const router = express.Router();

// Career advice page
router.get('/', checkAuthenticated, checkUserType('seeker'), async (req, res) => {
  try {
    const categories = [
      { id: 'resume', name: 'Resume Tips', icon: 'file-earmark-text' },
      { id: 'interview', name: 'Interview Preparation', icon: 'person-badge' },
      { id: 'career', name: 'Career Growth', icon: 'graph-up-arrow' },
      { id: 'salary', name: 'Salary Negotiation', icon: 'cash-stack' },
      { id: 'skills', name: 'Skills Development', icon: 'tools' },
      { id: 'networking', name: 'Networking', icon: 'people-fill' }
    ];
    
    const db = await getDb();
    const seeker = await db.get('SELECT * FROM job_seekers WHERE user_id = ?', [req.session.user.id]);
    
    res.render('advice/index', {
      title: 'Career Advice - uWork',
      categories,
      seeker
    });
  } catch (error) {
    console.error('Error loading advice page:', error);
    req.flash('error_msg', 'Error loading advice page');
    res.redirect('/dashboard');
  }
});

// Category advice page
router.get('/:category', checkAuthenticated, checkUserType('seeker'), async (req, res) => {
  try {
    const category = req.params.category;
    
    // Category validation
    const validCategories = ['resume', 'interview', 'career', 'salary', 'skills', 'networking'];
    if (!validCategories.includes(category)) {
      req.flash('error_msg', 'Invalid advice category');
      return res.redirect('/advice');
    }
    
    // Category data
    const categories = {
      resume: {
        name: 'Resume Tips',
        description: 'Get personalized advice to improve your resume and stand out to employers.',
        icon: 'file-earmark-text',
        questions: [
          'How can I improve my resume for a specific role?',
          'What skills should I highlight on my resume?',
          'How should I format my work experience?',
          'What resume mistakes should I avoid?',
          'How long should my resume be?'
        ]
      },
      interview: {
        name: 'Interview Preparation',
        description: 'Prepare for job interviews with personalized advice and practice questions.',
        icon: 'person-badge',
        questions: [
          'How should I prepare for a technical interview?',
          'What are common behavioral interview questions?',
          'How should I answer the "tell me about yourself" question?',
          'How can I demonstrate my skills in an interview?',
          'What questions should I ask the interviewer?'
        ]
      },
      career: {
        name: 'Career Growth',
        description: 'Get advice on advancing your career and reaching your professional goals.',
        icon: 'graph-up-arrow',
        questions: [
          'How can I advance in my current role?',
          'When is the right time to change jobs?',
          'How can I transition to a new industry?',
          'What skills should I develop for future career growth?',
          'How can I build a career development plan?'
        ]
      },
      salary: {
        name: 'Salary Negotiation',
        description: 'Learn strategies for negotiating better compensation and benefits.',
        icon: 'cash-stack',
        questions: [
          'How should I respond to a salary offer?',
          'When is the best time to negotiate salary?',
          'What benefits should I negotiate besides salary?',
          'How do I research appropriate salary ranges?',
          'How can I justify asking for a higher salary?'
        ]
      },
      skills: {
        name: 'Skills Development',
        description: 'Identify and develop the skills that will make you more valuable in the job market.',
        icon: 'tools',
        questions: [
          'What skills are most in-demand in my industry?',
          'How can I develop new technical skills?',
          'Which soft skills should I focus on improving?',
          'What certifications would be valuable for my career?',
          'How can I demonstrate my skills to potential employers?'
        ]
      },
      networking: {
        name: 'Networking',
        description: 'Build and leverage your professional network to find new opportunities.',
        icon: 'people-fill',
        questions: [
          'How can I build my professional network?',
          'How should I approach cold outreach?',
          'How can I use LinkedIn effectively?',
          'What networking events should I attend?',
          'How can I maintain professional relationships?'
        ]
      }
    };
    
    const db = await getDb();
    const seeker = await db.get('SELECT * FROM job_seekers WHERE user_id = ?', [req.session.user.id]);
    
    res.render('advice/category', {
      title: `${categories[category].name} - uWork`,
      category: categories[category],
      categoryId: category,
      seeker
    });
  } catch (error) {
    console.error('Error loading advice category:', error);
    req.flash('error_msg', 'Error loading advice category');
    res.redirect('/advice');
  }
});

export default router;