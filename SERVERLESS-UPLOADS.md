# Serverless File Upload Solution

## Problem
The error `ENOENT: no such file or directory, mkdir './uploads'` occurs in serverless environments like Netlify Functions because:

1. **Read-only filesystem**: Most serverless platforms have read-only filesystems except for `/tmp`
2. **Ephemeral storage**: Files stored in `/tmp` are lost between function invocations
3. **Path resolution**: Working directory assumptions don't hold in bundled serverless environments

## Solution Implemented

### 1. Environment Detection
Created `src/utils/serverless-utils.js` to detect serverless environments:
- Netlify: `process.env.NETLIFY`
- AWS Lambda: `process.env.AWS_LAMBDA_FUNCTION_NAME`
- Vercel: `process.env.VERCEL`
- Railway: `process.env.RAILWAY`
- Render: `process.env.RENDER`

### 2. Dynamic Upload Directory
- **Development**: Uses `./uploads` or `UPLOAD_DIR` environment variable
- **Serverless**: Uses `/tmp/uploads` (only writable directory)

### 3. Safe Directory Creation
Implemented `createDirectorySafely()` function that:
- Handles filesystem permission errors gracefully
- Provides appropriate warnings for different environments
- Doesn't crash the application if directory creation fails

## Current Status

✅ **Fixed Issues:**
- No more `ENOENT` errors when trying to create upload directories
- Proper path resolution in serverless environments
- Graceful handling of filesystem limitations

⚠️ **Current Limitations:**
- Files uploaded to `/tmp` are **ephemeral** (lost between function invocations)
- Not suitable for persistent file storage in production

## Production Recommendations

For a production deployment, integrate with cloud storage:

### Option 1: Supabase Storage (Recommended)
Since you're already using Supabase for your database:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Upload file to Supabase Storage
const { data, error } = await supabase.storage
  .from('resumes')
  .upload(`user-${userId}/${fileName}`, file)
```

### Option 2: Netlify Blob Storage
```javascript
import { getStore } from "@netlify/blobs";

const store = getStore("resumes");
await store.set(fileName, fileBuffer);
```

### Option 3: AWS S3
```javascript
import AWS from 'aws-sdk';

const s3 = new AWS.S3();
await s3.upload({
  Bucket: 'your-bucket',
  Key: fileName,
  Body: fileBuffer
}).promise();
```

### Option 4: Cloudinary (for resume/document management)
```javascript
import { v2 as cloudinary } from 'cloudinary';

const result = await cloudinary.uploader.upload(filePath, {
  resource_type: 'raw', // For non-image files
  folder: 'resumes'
});
```

## Migration Path

1. **Immediate**: Current solution allows the app to run without crashes
2. **Short-term**: Add environment variable `CLOUD_STORAGE=true` to switch between local and cloud storage
3. **Long-term**: Implement one of the cloud storage solutions above

## Environment Variables

Add these to your Netlify environment variables:

```bash
# Required for cloud storage (choose one)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Or for custom upload directory
UPLOAD_DIR=/custom/path

# For development override
NODE_ENV=development
```

## Testing

The current implementation will:
1. Work in development with local file storage
2. Work in production with temporary file storage
3. Show appropriate warnings about file persistence
4. Not crash the application

Files will be temporarily available for the duration of the function execution, which is sufficient for:
- Resume parsing and text extraction
- Immediate processing workflows
- One-time operations per request

For persistent storage, implement one of the cloud storage options above. 