import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();

router.post('/analyze', async (req, res) => {
    try {
        const { title, description, category, priority, location } = req.body;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey || apiKey === 'AIzaSyBbtEbn4j0TUTm3rnpYqjnCVU611PZ3yt8') {
            // Fallback response when no API key
            return res.json({
                success: true,
                analysis: {
                    severity: priority === 'high' ? 'Critical' : priority === 'medium' ? 'Moderate' : 'Low',
                    severityScore: priority === 'high' ? 9 : priority === 'medium' ? 6 : 3,
                    department: getDepartment(category),
                    estimatedResolution: priority === 'high' ? '24-48 hours' : priority === 'medium' ? '3-5 days' : '7-14 days',
                    analysis: `This ${category.toLowerCase()} issue has been classified as ${priority} priority. The complaint relates to "${title}" in the ${location || 'reported'} area. Our system has automatically routed this to the ${getDepartment(category)} for prompt action.`,
                    suggestedResponses: [
                        `I am writing to follow up on my civic complaint regarding ${title}. This issue requires immediate attention as it affects the safety and well-being of residents in the area.`,
                        `Dear Municipal Authority, I wish to bring to your notice a ${category.toLowerCase()} issue at ${location || 'my locality'}. The problem of "${title}" has been persisting and needs urgent resolution.`,
                        `To the concerned department, this is a formal complaint about ${title}. I request you to kindly look into this matter and take necessary corrective measures at the earliest.`
                    ],
                    recommendations: [
                        'Document the issue with photos from multiple angles',
                        'Note the exact location and nearby landmarks',
                        'Follow up if no response within the estimated timeline',
                        'Share your tracking ID with neighbours for community support'
                    ]
                }
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `You are an expert civic issue analyst. Analyze this civic complaint and provide a structured response.

Complaint Details:
- Title: ${title}
- Description: ${description}
- Category: ${category}
- Priority: ${priority}
- Location: ${location || 'Not specified'}

Provide your analysis in the following JSON format (respond ONLY with valid JSON, no markdown):
{
  "severity": "Critical/Moderate/Low",
  "severityScore": <1-10>,
  "department": "<recommended government department>",
  "estimatedResolution": "<estimated time to resolve>",
  "analysis": "<detailed analysis of the issue, its impact, and urgency - 2-3 sentences>",
  "suggestedResponses": [
    "<formal complaint letter text the citizen can send to authorities - 2-3 sentences>",
    "<follow-up message template - 2-3 sentences>",
    "<escalation message if no response - 2-3 sentences>"
  ],
  "recommendations": [
    "<recommendation 1 for the citizen>",
    "<recommendation 2>",
    "<recommendation 3>",
    "<recommendation 4>"
  ]
}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Parse JSON from response
        let analysis;
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            analysis = JSON.parse(jsonMatch ? jsonMatch[0] : text);
        } catch {
            analysis = {
                severity: 'Moderate',
                severityScore: 5,
                department: getDepartment(category),
                estimatedResolution: '3-5 days',
                analysis: text,
                suggestedResponses: ['Please contact your local municipal office for further assistance.'],
                recommendations: ['Follow up with the concerned department regularly.']
            };
        }

        res.json({ success: true, analysis });
    } catch (err) {
        console.error('AI analysis error:', err);
        res.status(500).json({ success: false, error: 'AI analysis failed' });
    }
});

function getDepartment(category) {
    const map = {
        'Roads': 'Public Works Department (PWD)',
        'Water': 'Water Supply & Sewerage Board',
        'Electricity': 'Electricity Distribution Company',
        'Sanitation': 'Municipal Sanitation Department',
        'Safety': 'Public Safety & Police Department',
        'Drainage': 'Drainage & Storm Water Department',
        'Streetlights': 'Electrical Maintenance Division',
        'Parks': 'Horticulture & Parks Department',
        'Other': 'Municipal Corporation - General'
    };
    return map[category] || 'Municipal Corporation - General';
}

export default router;
