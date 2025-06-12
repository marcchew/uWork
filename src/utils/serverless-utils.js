import fs from 'fs';
import path from 'path';

/**
 * Detect if we're running in a serverless environment
 */
export function isServerlessEnvironment() {
  return !!(
    process.env.NETLIFY || 
    process.env.AWS_LAMBDA_FUNCTION_NAME || 
    process.env.VERCEL ||
    process.env.RAILWAY ||
    process.env.RENDER
  );
}

/**
 * Get the appropriate upload directory for the current environment
 */
export function getUploadDirectory(fallbackDir = './uploads') {
  if (isServerlessEnvironment()) {
    return '/tmp/uploads';
  }
  return process.env.UPLOAD_DIR || fallbackDir;
}

/**
 * Safely create a directory, handling serverless limitations
 */
export function createDirectorySafely(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      return true;
    }
    return true;
  } catch (error) {
    if (isServerlessEnvironment()) {
      console.warn(`Could not create directory in serverless environment: ${error.message}`);
      return false;
    } else {
      console.error(`Failed to create directory: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Log warnings about serverless file handling limitations
 */
export function warnAboutServerlessLimitations() {
  if (isServerlessEnvironment()) {
    console.warn('⚠️  SERVERLESS ENVIRONMENT DETECTED');
    console.warn('⚠️  Files stored in /tmp are ephemeral and will be lost between function invocations');
    console.warn('⚠️  Consider implementing cloud storage integration for production use:');
    console.warn('   - Supabase Storage (recommended since you\'re using Supabase)');
    console.warn('   - AWS S3');
    console.warn('   - Netlify Blob Storage');
    console.warn('   - Cloudinary');
  }
} 