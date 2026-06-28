// src/config/groq.js
// ─────────────────────────────────────────────────────────────
// Groq AI integration using the official groq-sdk
// Model: llama3-8b-8192  (fast, free tier available)
// Docs : https://console.groq.com/docs/openai
// ─────────────────────────────────────────────────────────────
const Groq   = require('groq-sdk');
const logger = require('./logger');

// Single shared Groq client instance
const groqClient = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = process.env.GROQ_MODEL || 'llama3-8b-8192';

/**
 * generateProblemSummary
 * Calls Groq LLM to produce a concise, formal 2-3 sentence
 * official summary of a rural problem report.
 *
 * @param {string} title       - Problem title
 * @param {string} description - Full user description
 * @param {string} category    - Problem category name
 * @param {string} location    - "village, district, state"
 * @returns {Promise<{summary: string, tags: string[]}>}
 */
async function generateProblemSummary(title, description, category, location) {
  try {
    const systemPrompt = `You are an official assistant for the Indian Government's Rural Area Problems Portal.
Your job is to analyse citizen-submitted problem reports from rural villages and produce:
1. A concise 2-3 sentence formal summary suitable for government officials.
2. Up to 4 relevant tags (single words or short phrases).

Always respond ONLY with valid JSON in this exact shape:
{
  "summary": "<2-3 sentence formal summary>",
  "tags": ["tag1", "tag2", "tag3"]
}
Do NOT include any text outside the JSON object.`;

    const userPrompt = `Problem Report:
Title     : ${title}
Category  : ${category}
Location  : ${location}
Description: ${description}

Generate the JSON summary and tags now.`;

    const completion = await groqClient.chat.completions.create({
      model:       MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
      temperature: 0.3,
      max_tokens:  300,
      response_format: { type: 'json_object' },
    });

    const raw     = completion.choices[0]?.message?.content || '{}';
    const parsed  = JSON.parse(raw);
    const summary = (parsed.summary || '').trim();
    const tags    = Array.isArray(parsed.tags) ? parsed.tags.slice(0, 4) : [];

    logger.info(`Groq summary generated for: "${title}"`);
    return { summary, tags };
  } catch (err) {
    logger.error('Groq API error:', err.message);
    return { summary: null, tags: [] };
  }
}

/**
 * generateAdminInsight
 * Given problem metadata, produces a short admin action suggestion.
 *
 * @param {object} problem - { title, description, category, state, district, upvotes, status }
 * @returns {Promise<string>}
 */
async function generateAdminInsight(problem) {
  try {
    const prompt = `You are a rural governance advisor for India.
A government official is reviewing this problem report:

Title   : ${problem.title}
Category: ${problem.category}
Location: ${problem.district}, ${problem.state}
Status  : ${problem.status}
Upvotes : ${problem.upvotes}
Description: ${problem.description}

In 1-2 sentences, suggest the most actionable next step the local government should take.
Respond with ONLY the suggestion text, no preamble.`;

    const completion = await groqClient.chat.completions.create({
      model:       MODEL,
      messages:    [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens:  120,
    });

    return completion.choices[0]?.message?.content?.trim() || null;
  } catch (err) {
    logger.error('Groq admin insight error:', err.message);
    return null;
  }
}

module.exports = { groqClient, generateProblemSummary, generateAdminInsight };
