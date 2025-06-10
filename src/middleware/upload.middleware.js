import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

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

// Upload directory
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');

// Create upload directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
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