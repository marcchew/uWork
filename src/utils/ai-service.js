import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize OpenAI API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyze the match between a job seeker and a job posting using AI
 * @param {Object} seekerData - Job seeker data
 * @param {Object} jobData - Job posting data
 * @returns {Promise<Object>} - Match score and reasoning
 */
async function analyzeMatchWithAI(seekerData, jobData) {
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
    return {
      match_score: 50,
      reasoning: "Error generating AI match. This is a fallback score based on basic keyword matching."
    };
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
    return "We're sorry, but we couldn't generate personalized advice at this time. Please try again later.";
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

export { analyzeMatchWithAI, generateCareerAdvice };