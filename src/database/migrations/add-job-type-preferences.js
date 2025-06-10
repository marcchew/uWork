import { getDbConnection } from '../db.js';

async function addJobTypePreferences() {
  try {
    const db = await getDbConnection();
    
    console.log('Adding job type preferences columns to job_seekers table...');
    
    // Add preferred_job_types column
    await db.run(`
      ALTER TABLE job_seekers 
      ADD COLUMN preferred_job_types TEXT DEFAULT '[]'
    `);
    
    // Add remote_work_preference column
    await db.run(`
      ALTER TABLE job_seekers 
      ADD COLUMN remote_work_preference BOOLEAN DEFAULT 0
    `);
    
    console.log('✅ Job type preferences columns added successfully');
    
  } catch (error) {
    // Column might already exist, check error message
    if (error.message.includes('duplicate column name')) {
      console.log('✅ Job type preferences columns already exist');
    } else {
      console.error('❌ Error adding job type preferences columns:', error);
      throw error;
    }
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addJobTypePreferences()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { addJobTypePreferences }; 