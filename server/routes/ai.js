import express from 'express';
import Groq from 'groq-sdk';

const router = express.Router();

let groq;
try {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
} catch (e) {
  // If no API key is provided the constructor throws; we'll log and fall back later
  console.warn('Groq client not initialized (missing API key)');
  groq = null;
}

router.post('/analyze', async (req, res) => {
  try {
    const { title, description, category, priority, location } = req.body;

    // 🔹 Fallback if no API key or groq client was not initialized
    if (!process.env.GROQ_API_KEY || !groq) {
      return res.json({
        success: true,
        analysis: buildFallback(title, category, priority, location)
      });
    }

    const prompt = `
You are an expert civic issue analyst.

Analyze this complaint and return ONLY valid JSON in this format:

{
  "severity": "",
  "severityScore": 0,
  "department": "",
  "estimatedResolution": "",
  "analysis": "",
  "suggestedResponses": [],
  "recommendations": []
}

Complaint Details:
Title: ${title}
Description: ${description}
Category: ${category}
Priority: ${priority}
Location: ${location || 'Not specified'}
`;

    const completion = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        { role: "system", content: "You analyze civic issues and return structured JSON only." },
        { role: "user", content: prompt }
      ],
      temperature: 0.6,
    });

    const responseText = completion.choices[0].message.content;

    let analysis;

    try {
      analysis = JSON.parse(responseText);
    } catch {
      analysis = {
        severity: 'Moderate',
        severityScore: 5,
        department: getDepartment(category),
        estimatedResolution: '3-5 days',
        analysis: responseText,
        suggestedResponses: [
          'Please contact your local municipal office for assistance.'
        ],
        recommendations: [
          'Follow up if no response within expected timeline.'
        ]
      };
    }

    res.json({ success: true, analysis });

  } catch (err) {
    console.error('Groq AI error:', err);
    res.status(500).json({ success: false, error: 'AI analysis failed' });
  }
});

function buildFallback(title, category, priority, location) {
  return {
    severity: priority === 'high' ? 'Critical' : priority === 'medium' ? 'Moderate' : 'Low',
    severityScore: priority === 'high' ? 9 : priority === 'medium' ? 6 : 3,
    department: getDepartment(category),
    estimatedResolution: priority === 'high' ? '24-48 hours' : priority === 'medium' ? '3-5 days' : '7-14 days',
    analysis: `This ${category.toLowerCase()} issue titled "${title}" in ${location || 'the reported area'} has been classified as ${priority} priority and routed to ${getDepartment(category)}.`,
    suggestedResponses: [
      `I am writing to follow up regarding ${title}. Kindly take necessary action.`,
      `Dear Authority, this issue needs attention at ${location || 'my locality'}.`,
      `Please escalate if unresolved within timeline.`
    ],
    recommendations: [
      'Document issue with photos',
      'Note exact location',
      'Follow up regularly',
      'Share tracking ID with neighbours'
    ]
  };
}

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