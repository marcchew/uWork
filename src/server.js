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

// Import routes
import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import profileRoutes from './routes/profile.routes.js';
import jobRoutes from './routes/job.routes.js';
import applicationRoutes from './routes/application.routes.js';
import messageRoutes from './routes/message.routes.js';
import adviceRoutes from './routes/advice.routes.js';
import apiRoutes from './routes/api.routes.js';

// Import middleware
import { checkAuthenticated } from './middleware/auth.middleware.js';

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Function to get Vite assets in production
function getViteAssets() {
  if (NODE_ENV === 'production') {
    try {
      const manifestPath = path.join(__dirname, '../public/dist/.vite/manifest.json');
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
app.use(express.static(path.join(__dirname, '../public')));

// Serve Vite built assets in production
if (NODE_ENV === 'production') {
  app.use('/dist', express.static(path.join(__dirname, '../public/dist')));
}

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
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

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'uwork_job_matching_platform_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 1 day
    secure: process.env.NODE_ENV === 'production',
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
  if (NODE_ENV === 'production') {
    console.log('Serving Vite built assets from /public/dist');
  }
});