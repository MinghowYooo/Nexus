import { API_CONFIG } from '../config/api.js';

/**
 * Gemini API Service
 * Handles all Gemini API interactions
 */
export class GeminiApiService {
  constructor() {
    this.baseUrl = API_CONFIG.GEMINI.BASE_URL;
    this.apiKey = API_CONFIG.GEMINI.API_KEY;
    this.model = API_CONFIG.GEMINI.MODEL;
  }

  /**
   * Generate content using Gemini API
   * @param {string} prompt - The prompt to send to Gemini
   * @param {AbortSignal} signal - Abort signal for cancellation
   * @returns {Promise<string>} Generated text response
   */
  async generateContent(prompt, signal = null) {
    if (!this.apiKey) {
      throw new Error('Gemini API key is not configured');
    }

    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;
    const payload = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }]
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
        throw new Error('Invalid response format from Gemini API');
      }

      return result.candidates[0].content.parts[0].text;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error;
      }
      console.error('Gemini API error:', error);
      throw error;
    }
  }

  /**
   * Generate search response for video discovery
   * @param {string} query - User's search query
   * @param {AbortSignal} signal - Abort signal for cancellation
   * @returns {Promise<string>} AI response about the search
   */
  async generateSearchResponse(query, signal = null) {
    const prompt = `You are a helpful video discovery assistant. A user is searching for videos about: "${query}". 

Provide a helpful response that includes:
1. A brief, informative explanation about the topic (2-3 sentences)
2. A friendly confirmation that you're finding the best videos about this topic
3. Maybe mention why this topic is interesting or popular

Be educational and engaging while keeping it concise (3-4 sentences total).`;

    return this.generateContent(prompt, signal);
  }

  /**
   * Analyze comments for a video
   * @param {Array} comments - Array of comment objects
   * @param {AbortSignal} signal - Abort signal for cancellation
   * @returns {Promise<string>} Analysis of the comments
   */
  async analyzeComments(comments, signal = null) {
    const commentTexts = comments.map(c => c.text).join('\n');
    
    const prompt = `You are a helpful assistant for video creators. Analyze the following comments and provide a concise, bulleted summary covering:
- Sentiment (positive, negative, neutral)
- Key Themes (what people are talking about)
- Common Questions (frequently asked questions)
- Actionable Insights (what the creator should know)

COMMENTS:
${commentTexts}

Format your response with clear bullet points under each category.`;

    return this.generateContent(prompt, signal);
  }

  /**
   * Generate a reply to a specific comment
   * @param {Object} comment - The comment to reply to
   * @param {string} instruction - User's instruction for the reply
   * @param {AbortSignal} signal - Abort signal for cancellation
   * @returns {Promise<string>} Generated reply
   */
  async generateCommentReply(comment, instruction, signal = null) {
    const prompt = `You are a helpful assistant for video creators. A user wants you to draft a reply to a specific comment.

The comment you are replying to is from ${comment.user} and says: "${comment.text}"

The user's instruction for the reply is: "${instruction}"

Draft a suitable and friendly reply that addresses the comment appropriately. Keep it conversational and authentic.`;

    return this.generateContent(prompt, signal);
  }

  /**
   * Generate smart recommendations based on a playlist
   * @param {Object} playlist - Playlist object
   * @param {AbortSignal} signal - Abort signal for cancellation
   * @returns {Promise<string>} Smart recommendations
   */
  async generateSmartRecommendations(playlist, signal = null) {
    const prompt = `You are a smart video recommendation assistant. A user has a playlist called "${playlist.name}" with ${playlist.videoIds.length} videos.

Based on this playlist theme, suggest 3 similar videos or topics they might enjoy. Be creative and encouraging, and explain why each recommendation would be a good fit. Format as a numbered list with brief explanations.`;

    return this.generateContent(prompt, signal);
  }

  /**
   * Proofread text
   * @param {string} text - Text to proofread
   * @param {AbortSignal} signal - Abort signal for cancellation
   * @returns {Promise<string>} Proofread text
   */
  async proofreadText(text, signal = null) {
    const prompt = `Proofread the following text for spelling and grammar mistakes, providing only the corrected version:

"${text}"`;

    return this.generateContent(prompt, signal);
  }

  /**
   * Rewrite text to be clearer and more engaging
   * @param {string} text - Text to rewrite
   * @param {AbortSignal} signal - Abort signal for cancellation
   * @returns {Promise<string>} Rewritten text
   */
  async rewriteText(text, signal = null) {
    const prompt = `Rewrite the following text to be clearer, more engaging, and more concise:

"${text}"`;

    return this.generateContent(prompt, signal);
  }

  /**
   * Detect user intent from their message
   * @param {string} message - User's message
   * @param {AbortSignal} signal - Abort signal for cancellation
   * @returns {Promise<Object>} Intent detection result
   */
  async detectIntent(message, signal = null) {
    const prompt = `Analyze the following user message and determine their intent. Respond with a JSON object containing:

{
  "intent": "search" | "opinion" | "chat",
  "confidence": 0.0-1.0,
  "searchQuery": "extracted search terms if intent is search, null otherwise",
  "sentiment": "positive" | "negative" | "neutral" if intent is opinion, null otherwise",
  "videoTopic": "topic/subject being discussed if relevant, null otherwise"
}

Guidelines:
- "search": User wants to find new videos (e.g., "show me cooking videos", "find tutorials about React", "I want to watch something about fitness")
- "opinion": User is expressing feelings about videos/content (e.g., "I love cooking videos", "this video was boring", "I hate this type of content", "that was amazing")
- "chat": General conversation, questions, or other interactions

User message: "${message}"`;

    try {
      const response = await this.generateContent(prompt, signal);
      
      // Clean the response to extract JSON
      let cleanedResponse = response.trim();
      
      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Try to extract JSON from the response
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }
      
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Intent detection error:', error);
      // Fallback to chat intent
      return {
        intent: 'chat',
        confidence: 0.5,
        searchQuery: null,
        sentiment: null,
        videoTopic: null
      };
    }
  }
}

// Export singleton instance
export const geminiApi = new GeminiApiService();
