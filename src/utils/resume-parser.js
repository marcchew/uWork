import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PdfReader } from 'pdfreader';
import mammoth from 'mammoth';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Extracts text from PDF files using pdfreader
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromPDF(buffer) {
  return new Promise((resolve, reject) => {
    try {
      const pdfReader = new PdfReader();
      let text = '';
      
      pdfReader.parseBuffer(buffer, (err, item) => {
        if (err) {
          console.error('Error parsing PDF:', err);
          reject(err);
          return;
        }
        
        if (!item) {
          // End of file
          resolve(text);
          return;
        }
        
        if (item.text) {
          text += item.text + ' ';
        }
      });
    } catch (error) {
      console.error('Error parsing PDF:', error);
      resolve(''); // Return empty string on error instead of rejecting
    }
  });
}

/**
 * Extracts text from DOCX files
 * @param {Buffer} buffer - DOCX file buffer
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromDOCX(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    return '';
  }
}

/**
 * Parses resume file and extracts text
 * @param {string} filePath - Path to the uploaded file
 * @returns {Promise<string>} - Extracted text from resume
 */
export async function parseResume(filePath) {
  try {
    const fileExt = path.extname(filePath).toLowerCase();
    const buffer = fs.readFileSync(filePath);
    
    if (fileExt === '.pdf') {
      return await extractTextFromPDF(buffer);
    } else if (fileExt === '.docx') {
      return await extractTextFromDOCX(buffer);
    } else {
      throw new Error('Unsupported file format. Please upload a PDF or DOCX file.');
    }
  } catch (error) {
    console.error('Error parsing resume:', error);
    throw error;
  }
}

export async function extractSkills(text) {
  if (!text) return [];
  
  // If OpenAI is not available, return a basic skill extraction
  if (!openai) {
    console.warn('OpenAI API key not available. Using basic skill extraction.');
    // Basic keyword matching for common skills
    const commonSkills = [
      'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'HTML', 'CSS',
      'Communication', 'Leadership', 'Problem Solving', 'Teamwork', 'Management'
    ];
    
    const foundSkills = commonSkills.filter(skill => 
      text.toLowerCase().includes(skill.toLowerCase())
    );
    
    return foundSkills.length > 0 ? foundSkills : ['General Skills'];
  }
  
  try {
    const prompt = `
      Extract technical and soft skills from the following resume text.
      Return only a JSON array of skills, properly categorized.
      Format: {"technical_skills": [], "soft_skills": []}
      
      Resume text:
      ${text}
    `;
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {role: "system", content: "You are an expert HR professional skilled at identifying technical and soft skills from resumes."},
        {role: "user", content: prompt}
      ]
    });
    
    const skills = JSON.parse(response.choices[0].message.content);
    return [...skills.technical_skills, ...skills.soft_skills];
  } catch (error) {
    console.error('Error extracting skills with AI:', error);
    return ['General Skills']; // Fallback
  }
}

export default parseResume;