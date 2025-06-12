import express from 'express';
import bcrypt from 'bcryptjs';
import { getDbConnection } from '../database/db.js';
import { checkNotAuthenticated } from '../middleware/auth.middleware.js';

const router = express.Router();

// Landing page
router.get('/', (req, res) => {
  res.render('index', { title: 'uWork - AI-Powered Job Matching' });
});

// Register page
router.get('/register', checkNotAuthenticated, (req, res) => {
  res.render('auth/register', { title: 'Register - uWork' });
});

// Register handler
router.post('/register', checkNotAuthenticated, async (req, res) => {
  try {
    const { username, email, password, confirmPassword, userType } = req.body;
    
    // Validation
    const errors = [];
    
    if (!username || !email || !password || !confirmPassword) {
      errors.push({ msg: 'Please fill in all fields' });
    }
    
    if (password !== confirmPassword) {
      errors.push({ msg: 'Passwords do not match' });
    }
    
    if (password.length < 6) {
      errors.push({ msg: 'Password should be at least 6 characters' });
    }
    
    if (!userType || !['seeker', 'company'].includes(userType)) {
      errors.push({ msg: 'Please select a valid user type' });
    }
    
    if (errors.length > 0) {
      return res.render('auth/register', {
        title: 'Register - uWork',
        errors,
        username,
        email,
        userType
      });
    }
    
    // Check if user already exists
    const db = await getDbConnection();
    const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    
    if (existingUser) {
      errors.push({ msg: 'Email is already registered' });
      return res.render('auth/register', {
        title: 'Register - uWork',
        errors,
        username,
        email,
        userType
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Insert new user
    const result = await db.run(
      'INSERT INTO users (username, email, password_hash, user_type) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, userType]
    );
    
    // Create profile record
    if (userType === 'seeker') {
      await db.run(
        'INSERT INTO job_seekers (user_id) VALUES (?)',
        [result.lastID]
      );
    } else if (userType === 'company') {
      await db.run(
        'INSERT INTO companies (user_id, company_name) VALUES (?, ?)',
        [result.lastID, username]
      );
    }
    
    req.flash('success_msg', 'You are now registered and can log in');
    res.redirect('/login');
  } catch (error) {
    console.error('Error registering user:', error);
    req.flash('error_msg', 'An error occurred during registration');
    res.redirect('/register');
  }
});

// Login page
router.get('/login', checkNotAuthenticated, (req, res) => {
  res.render('auth/login', { title: 'Login - uWork' });
});

// Login handler
router.post('/login', checkNotAuthenticated, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      req.flash('error_msg', 'Please fill in all fields');
      return res.redirect('/login');
    }
    
    // Check if user exists
    const db = await getDbConnection();
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    
    if (!user) {
      req.flash('error_msg', 'Invalid email or password');
      return res.redirect('/login');
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      req.flash('error_msg', 'Invalid email or password');
      return res.redirect('/login');
    }
    
    // Get additional profile data
    let profileData = null;
    
    if (user.user_type === 'seeker') {
      profileData = await db.get('SELECT * FROM job_seekers WHERE user_id = ?', [user.id]);
    } else if (user.user_type === 'company') {
      profileData = await db.get('SELECT * FROM companies WHERE user_id = ?', [user.id]);
    }
    
    // Create session
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      user_type: user.user_type,
      profile_completed: !!profileData && (
        (user.user_type === 'seeker' && profileData.full_name) || 
        (user.user_type === 'company' && profileData.company_name)
      )
    };
    
    // Redirect based on profile completion
    if (req.session.user.profile_completed) {
      res.redirect('/dashboard');
    } else {
      res.redirect('/profile-setup');
    }
  } catch (error) {
    console.error('Error logging in:', error);
    req.flash('error_msg', 'An error occurred during login');
    res.redirect('/login');
  }
});

// Logout handler
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/login');
  });
});

export default router;
