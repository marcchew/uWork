import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize OpenAI API only if API key is available
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Analyze the match between a job seeker and a job posting using AI
 * @param {Object} seekerData - Job seeker data
 * @param {Object} jobData - Job posting data
 * @returns {Promise<Object>} - Match score and reasoning
 */
async function analyzeMatchWithAI(seekerData, jobData) {
  // If OpenAI is not available, use fallback matching
  if (!openai) {
    console.warn('OpenAI API key not available. Using basic matching algorithm.');
    return calculateBasicMatch(seekerData, jobData);
  }

  try {
    // Extract seeker priorities
    const priorities = JSON.parse(seekerData.priorities || '{}');
    
    const prompt = `
      Analyze compatibility between job seeker and job posting.
      Consider seeker's priorities: ${formatPriorities(priorities)}
      
      Job Seeker Profile:
      - Skills: ${seekerData.skills}
      - Experience: ${seekerData.experience_years} years
      - Education: ${seekerData.education || 'Not specified'}
      - Location: ${seekerData.location || 'Not specified'}
      
      Job Posting:
      - Title: ${jobData.title}
      - Requirements: ${jobData.requirements}
      - Description: ${jobData.description}
      - Location: ${jobData.location || 'Not specified'}
      - Remote Option: ${jobData.remote_option ? 'Yes' : 'No'}
      
      Return JSON: {"match_score": 0-100, "reasoning": "detailed explanation"}
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {role: "system", content: "You are an expert HR recruiter with deep knowledge of job matching."},
        {role: "user", content: prompt}
      ]
    });
    
    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Error analyzing match with AI:', error);
    // Return a fallback match score
    return calculateBasicMatch(seekerData, jobData);
  }
}

/**
 * Generate career advice using AI
 * @param {Object} userData - User data
 * @param {string} category - Advice category
 * @param {string} question - User's specific question
 * @returns {Promise<string>} - AI-generated advice
 */
async function generateCareerAdvice(userData, category, question) {
  // If OpenAI is not available, provide basic advice
  if (!openai) {
    console.warn('OpenAI API key not available. Providing basic career advice.');
    return getBasicCareerAdvice(category, question);
  }

  try {
    const prompt = `
      Generate personalized career advice for a job seeker.
      
      Job Seeker Profile:
      - Skills: ${userData.skills || 'Not specified'}
      - Experience: ${userData.experience_years || 'Not specified'} years
      - Education: ${userData.education || 'Not specified'}
      
      Advice Category: ${category}
      Specific Question: ${question}
      
      Provide detailed, actionable advice with examples where appropriate.
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {role: "system", content: "You are a career coach with expertise in helping job seekers."},
        {role: "user", content: prompt}
      ]
    });
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error generating career advice:', error);
    return getBasicCareerAdvice(category, question);
  }
}

/**
 * Format seeker priorities for the AI prompt
 * @param {Object} priorities - Seeker priorities
 * @returns {string} - Formatted priorities
 */
function formatPriorities(priorities) {
  if (!priorities || Object.keys(priorities).length === 0) {
    return "No specific priorities";
  }
  
  return Object.entries(priorities)
    .map(([key, value]) => `${key.replace('_', ' ')}: ${value}/5`)
    .join(', ');
}

/**
 * Basic matching algorithm fallback when OpenAI is not available
 * @param {Object} seekerData - Job seeker data
 * @param {Object} jobData - Job posting data
 * @returns {Object} - Match score and reasoning
 */
function calculateBasicMatch(seekerData, jobData) {
  let score = 50; // Base score
  let reasons = [];
  
  // Check skill overlap
  if (seekerData.skills && jobData.requirements) {
    const seekerSkills = seekerData.skills.toLowerCase().split(/[,\s]+/);
    const jobRequirements = jobData.requirements.toLowerCase();
    
    const matchingSkills = seekerSkills.filter(skill => 
      skill.length > 2 && jobRequirements.includes(skill)
    );
    
    if (matchingSkills.length > 0) {
      score += Math.min(matchingSkills.length * 10, 30);
      reasons.push(`Matching skills: ${matchingSkills.join(', ')}`);
    }
  }
  
  // Check experience level
  if (seekerData.experience_years && jobData.requirements) {
    const experienceMatch = jobData.requirements.toLowerCase().includes('junior') && seekerData.experience_years < 3 ||
                           jobData.requirements.toLowerCase().includes('senior') && seekerData.experience_years >= 5 ||
                           jobData.requirements.toLowerCase().includes('mid') && seekerData.experience_years >= 2;
    
    if (experienceMatch) {
      score += 15;
      reasons.push('Experience level matches job requirements');
    }
  }
  
  // Ensure score is within bounds
  score = Math.min(Math.max(score, 20), 95);
  
  return {
    match_score: score,
    reasoning: `Basic matching algorithm result. ${reasons.length > 0 ? reasons.join('. ') : 'Limited matching criteria available.'} This is a fallback calculation - for more accurate matching, please configure the OpenAI API key.`
  };
}

/**
 * Basic career advice fallback when OpenAI is not available
 * @param {string} category - Advice category
 * @param {string} question - User's question
 * @returns {string} - Basic advice
 */
function getBasicCareerAdvice(category, question) {
  const basicAdvice = {
    'resume-tips': `
      **Basic Resume Tips:**
      
      • Keep your resume concise (1-2 pages maximum)
      • Use a clean, professional format with consistent fonts
      • Include a strong summary or objective statement
      • Highlight relevant skills and experience for each job application
      • Use action verbs to describe your accomplishments
      • Include quantifiable achievements where possible
      • Proofread carefully for grammar and spelling errors
      • Consider using keywords from the job description
      
      For personalized advice, please configure the OpenAI API key.
    `,
    'interview-prep': `
      **Interview Preparation Tips:**
      
      • Research the company and role thoroughly
      • Practice common interview questions out loud
      • Prepare specific examples using the STAR method (Situation, Task, Action, Result)
      • Prepare thoughtful questions to ask the interviewer
      • Plan your outfit in advance - dress professionally
      • Arrive 10-15 minutes early
      • Bring multiple copies of your resume
      • Follow up with a thank-you email within 24 hours
      
      For personalized advice, please configure the OpenAI API key.
    `,
    'career-growth': `
      **Career Growth Strategies:**
      
      • Set clear, measurable career goals
      • Continuously develop new skills relevant to your field
      • Seek feedback from supervisors and colleagues
      • Build a professional network in your industry
      • Consider finding a mentor or becoming one
      • Take on challenging projects and additional responsibilities
      • Stay updated with industry trends and technologies
      • Document your achievements and contributions
      
      For personalized advice, please configure the OpenAI API key.
    `,
    'salary-negotiation': `
      **Salary Negotiation Tips:**
      
      • Research market rates for your position and location
      • Consider the total compensation package, not just salary
      • Wait for the employer to make the first offer if possible
      • Be prepared to justify your requested salary with examples
      • Practice your negotiation conversation beforehand
      • Be professional and collaborative in your approach
      • Consider negotiating other benefits if salary is fixed
      • Get any agreements in writing
      
      For personalized advice, please configure the OpenAI API key.
    `
  };
  
  return basicAdvice[category] || `
    **General Career Advice:**
    
    Thank you for your question: "${question}"
    
    While we can't provide personalized AI-powered advice without the OpenAI API key configured, here are some general tips:
    
    • Focus on continuous learning and skill development
    • Build strong professional relationships
    • Set clear goals and track your progress
    • Stay adaptable to industry changes
    • Maintain a positive attitude and professional demeanor
    
    For personalized advice, please configure the OpenAI API key.
  `;
}

export { analyzeMatchWithAI, generateCareerAdvice };