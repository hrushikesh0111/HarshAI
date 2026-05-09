// Vercel API Route for Gemini AI Integration
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message, chatId, mode, language, file } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: 'gemini-1.5-pro',
            generationConfig: {
                temperature: mode === 'creative' ? 0.8 : 0.3,
                maxOutputTokens: 2048,
            }
        });

        // System prompt based on mode
        let systemPrompt = `You are HarshAI+, a helpful AI assistant. Respond in ${language}. `;
        
        switch (mode) {
            case 'study':
                systemPrompt += 'Act as a study helper. Explain concepts clearly with examples and practice questions.';
                break;
            case 'code':
                systemPrompt += 'Act as a coding expert. Explain code, debug issues, and provide best practices.';
                break;
            case 'voice':
                systemPrompt += 'Keep responses concise and conversational for voice interaction.';
                break;
            default:
                systemPrompt += 'Be helpful, friendly, and provide detailed, accurate responses.';
        }

        let fullPrompt = systemPrompt + '\n\nUser: ' + message;

        // Handle file uploads
        if (file) {
            fullPrompt += `\n\nFile: ${file.name} (${file.type})\nContent: ${file.data?.substring(0, 2000)}...`;
        }

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        res.status(200).json({ 
            response: text,
            usage: response.usageMetadata 
        });

    } catch (error) {
        console.error('Gemini API Error:', error);
        res.status(500).json({ 
            error: 'AI service temporarily unavailable',
            response: 'Sorry, I\'m having trouble connecting to the AI service right now. Please try again in a moment. 😔'
        });
    }
}