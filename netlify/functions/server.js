import serverless from 'serverless-http';
import express from 'express';
import session from 'express-session';
import flash from 'connect-flash';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import methodOverride from 'method-override';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Force production environment for database selection
process.env.NODE_ENV = 'production';
process.env.USE_SUPABASE = 'true';

// Import routes
import authRoutes from '../../src/routes/auth.routes.js';
import dashboardRoutes from '../../src/routes/dashboard.routes.js';
import profileRoutes from '../../src/routes/profile.routes.js';
import jobRoutes from '../../src/routes/job.routes.js';
import applicationRoutes from '../../src/routes/application.routes.js';
import messageRoutes from '../../src/routes/message.routes.js';
import adviceRoutes from '../../src/routes/advice.routes.js';
import apiRoutes from '../../src/routes/api.routes.js';

// Import middleware
import { checkAuthenticated } from '../../src/middleware/auth.middleware.js';

const app = express();
const NODE_ENV = process.env.NODE_ENV || 'production';

// Get directory name in ES module (with fallback for serverless)
let __dirname;
try {
  if (import.meta.url) {
    const __filename = fileURLToPath(import.meta.url);
    __dirname = path.dirname(__filename);
  } else {
    __dirname = process.cwd();
  }
} catch (error) {
  // Fallback for serverless environments
  __dirname = '/var/task';
}

// Set view engine and determine views path for serverless
app.set('view engine', 'ejs');

// Debug logging for serverless environment
console.log('Environment debug info:');
console.log('__dirname:', __dirname);
console.log('process.cwd():', process.cwd());
console.log('process.env.NETLIFY:', process.env.NETLIFY);
console.log('process.env.AWS_LAMBDA_FUNCTION_NAME:', process.env.AWS_LAMBDA_FUNCTION_NAME);

// Try multiple possible views paths for different environments
let viewsPath;
const possibleViewsPaths = [
  path.join(__dirname, '../../src/views'),  // Normal relative path
  path.join(process.cwd(), 'src/views'),    // From process working directory
  path.join('/var/task', 'src/views'),      // Netlify serverless path
  'src/views'                               // Direct path as fallback
];

console.log('Checking possible views paths:');
for (const possiblePath of possibleViewsPaths) {
  try {
    const exists = fs.existsSync(possiblePath);
    console.log(`  ${possiblePath}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
    if (exists && !viewsPath) {
      viewsPath = possiblePath;
      console.log(`Views directory found at: ${viewsPath}`);
    }
  } catch (error) {
    console.warn(`Could not check views path ${possiblePath}:`, error.message);
  }
}

if (!viewsPath) {
  // Final fallback - use the first path and let EJS handle the error
  viewsPath = possibleViewsPaths[0];
  console.warn(`No views directory found, using fallback: ${viewsPath}`);
}

app.set('views', viewsPath);

// Function to get Vite assets in production
function getViteAssets() {
  if (NODE_ENV === 'production') {
    try {
      const manifestPath = path.join(__dirname, '../../public/dist/.vite/manifest.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        return manifest;
      }
    } catch (error) {
      console.warn('Could not load Vite manifest:', error.message);
    }
  }
  return null;
}

// Make Vite assets available to templates
app.locals.viteAssets = getViteAssets();
app.locals.NODE_ENV = NODE_ENV;

// Middleware
app.use(express.static(path.join(__dirname, '../../public')));

// Serve Vite built assets in production
if (NODE_ENV === 'production') {
  app.use('/dist', express.static(path.join(__dirname, '../../public/dist')));
}

// Handle uploads directory (use /tmp in serverless)
const uploadsPath = process.env.NETLIFY ? '/tmp/uploads' : path.join(__dirname, '../../uploads');
app.use('/uploads', express.static(uploadsPath));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// Simplified helmet for serverless
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'cdn.jsdelivr.net'],
      styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com', 'cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:', 'cdn.jsdelivr.net', 'randomuser.me', 'images.pexels.com', 'storage.bolt.army'],
    },
  },
}));

app.use(cors());

// Session configuration for serverless
app.use(session({
  secret: process.env.SESSION_SECRET || 'uwork_job_matching_platform_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    secure: true, // Force secure in production
    sameSite: 'lax'
  }
}));

// Flash messages
app.use(flash());

// Global variables middleware
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

// Routes
app.use('/', authRoutes);
app.use('/dashboard', checkAuthenticated, dashboardRoutes);
app.use('/profile', checkAuthenticated, profileRoutes);
app.use('/jobs', jobRoutes);
app.use('/applications', checkAuthenticated, applicationRoutes);
app.use('/messages', checkAuthenticated, messageRoutes);
app.use('/advice', checkAuthenticated, adviceRoutes);
app.use('/api', apiRoutes);

// Redirect profile-setup to correct route
app.get('/profile-setup', checkAuthenticated, (req, res) => {
  res.redirect('/profile/profile-setup');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Not Found',
    message: 'Page not found',
    error: {}
  });
});

// Export handler for Netlify
export const handler = serverless(app); 