# Deploying uWork to Netlify with Supabase

This guide will help you deploy your uWork job matching platform to Netlify using Supabase as the database.

## Prerequisites

1. **Netlify Account**: Sign up at [netlify.com](https://netlify.com)
2. **Supabase Account**: Sign up at [supabase.com](https://supabase.com) for a free PostgreSQL database
3. **OpenAI API Key**: Get one from [openai.com](https://openai.com)

## Step 1: Set Up Supabase Database

1. **Create a new project** on Supabase
2. **Get your project details**:
   - Go to Settings → API
   - Copy your Project URL
   - Copy your `anon` public key
   - Copy your `service_role` secret key (for admin operations)

3. **Set up the database schema**:
   - Go to SQL Editor in your Supabase dashboard
   - Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
   - Run the migration to create all tables

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Local Testing with Supabase (Optional)

To test with Supabase locally:

1. Create a `.env` file:
```env
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
USE_SUPABASE=true
SESSION_SECRET=your-session-secret
OPENAI_API_KEY=your-openai-api-key
NODE_ENV=development
```

2. Test locally:
```bash
npm run dev:netlify
```

## Step 4: Deploy to Netlify

### Option A: GitHub Integration (Recommended)

1. **Push your code to GitHub**
2. **Connect your repository to Netlify**
3. **Configure build settings**:
   - Build command: `npm run build`
   - Publish directory: `public`
   - Functions directory: `netlify/functions`

### Option B: Netlify CLI

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Login to Netlify:
```bash
netlify login
```

3. Deploy:
```bash
netlify deploy --prod
```

## Step 5: Configure Environment Variables

In your Netlify site settings → Environment variables, add:

```
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
USE_SUPABASE=true
NODE_ENV=production
SESSION_SECRET=your-production-session-secret-make-it-long-and-random
OPENAI_API_KEY=your-openai-api-key
```

## Step 6: Database Setup

The database tables and functions will be created when you run the SQL migration in your Supabase dashboard. No additional setup needed after deployment!

## Features Included

✅ **Full-time/Part-time Job Selection**: Advanced filtering and preferences  
✅ **Job Type Filtering**: Filter jobs by employment type  
✅ **Personalized Recommendations**: Based on job seeker preferences  
✅ **Search & Filter**: Comprehensive job search functionality  
✅ **PWA Support**: Offline capabilities and installable app  
✅ **Responsive Design**: Works on all devices  
✅ **AI-Powered Matching**: OpenAI integration for smart job matching  
✅ **Real-time Database**: PostgreSQL with Supabase features  
✅ **Row Level Security**: Built-in security policies  

## Supabase Advantages

- **PostgreSQL**: More powerful than MySQL/SQLite
- **Real-time subscriptions**: Live updates (can be implemented later)
- **Built-in authentication**: Ready for user auth expansion
- **Row Level Security**: Database-level security policies
- **Auto-generated APIs**: REST and GraphQL endpoints
- **Storage**: File uploads (for resume storage)
- **Edge Functions**: Serverless functions within Supabase

## Troubleshooting

### Database Connection Issues
- Verify your Supabase project URL and API keys
- Check if your project is active
- Ensure all environment variables are set correctly
- Verify RLS policies allow your operations

### Build Failures
- Check Netlify function logs
- Verify all dependencies are in `package.json`
- Ensure environment variables are set
- Check that Supabase migration was run successfully

### Session Issues
- Make sure `SESSION_SECRET` is set and long enough
- Check if cookies are being set correctly (HTTPS required in production)

### Database Query Issues
- Check Supabase logs in your dashboard
- Verify table structure matches the schema
- Ensure RPC functions are created correctly

## Local Development

For local development, you can still use SQLite:

```bash
# Use SQLite locally
npm run dev

# Use Supabase locally
USE_SUPABASE=true npm run dev
```

The app will automatically use SQLite locally and Supabase in production unless you set `USE_SUPABASE=true`.

## Performance Optimization

- **Connection pooling**: Supabase handles this automatically
- **Indexed queries**: Optimized with database indexes
- **Edge deployment**: Supabase uses global CDN
- **Caching**: Implement Redis caching if needed
- **Real-time**: Add live job notifications

## Advanced Supabase Features (Future Enhancements)

1. **Real-time job notifications**:
```javascript
supabase
  .channel('jobs')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'jobs' }, 
      payload => console.log('New job posted!', payload))
  .subscribe()
```

2. **File storage for resumes**:
```javascript
const { data, error } = await supabase.storage
  .from('resumes')
  .upload('resume.pdf', file)
```

3. **Built-in authentication**:
```javascript
const { user, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password'
})
```

## Support

If you encounter issues:
1. Check Netlify function logs
2. Review Supabase project logs
3. Verify environment variables
4. Check the browser console for client-side errors
5. Test database queries in Supabase SQL Editor

Your uWork platform is now ready for production use on Netlify with Supabase! 🚀

## Migration from Other Databases

If you're migrating from SQLite or another database:

1. Export your existing data
2. Transform data format if needed
3. Import into Supabase using SQL or the dashboard
4. Update environment variables
5. Deploy to Netlify

Your job matching platform now has enterprise-grade PostgreSQL backing with real-time capabilities! 