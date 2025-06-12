import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { isServerlessEnvironment, getUploadDirectory, createDirectorySafely, warnAboutServerlessLimitations } from '../utils/serverless-utils.js';

// Load environment variables
dotenv.config();

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

// Get appropriate upload directory for current environment
const uploadDir = getUploadDirectory(path.join(__dirname, '../../uploads'));

// Create upload directory and show warnings if needed
createDirectorySafely(uploadDir);
warnAboutServerlessLimitations();

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure the directory exists before writing
    if (createDirectorySafely(uploadDir)) {
      cb(null, uploadDir);
    } else {
      cb(new Error('Unable to create upload directory'));
    }
  },
  filename: (req, file, cb) => {
    const userId = req.session.user ? req.session.user.id : 'guest';
    const timestamp = Date.now();
    const fileExt = path.extname(file.originalname);
    const fileName = `resume_${userId}_${timestamp}${fileExt}`;
    cb(null, fileName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept only pdf and docx files
  const allowedFileTypes = ['.pdf', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedFileTypes.includes(ext)) {
    return cb(null, true);
  }
  
  cb(new Error('Only PDF and DOCX files are allowed'));
};

// Create upload middleware
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 128 * 1024 * 1024, // 128MB max file size
  }
});

export { upload };