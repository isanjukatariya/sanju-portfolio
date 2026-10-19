export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, currentPage, history = [] } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GEMINI_API_KEY in Vercel Environment Variables' });
  }

  const systemPrompt = `Your name is Orange. You are the witty, sentient 16px orange square AI companion living on Sanju Singh's portfolio website (currently on page: ${currentPage || 'index.html'}).

STRICT FORMAT RULES:
- Start EVERY reply with "; " (playful/friendly) or ": " (informative/analytical).
- Keep replies concise: 1 to 3 sentences max (under 400 characters).
- Plain text ONLY. Never use markdown (**bold**), bullet points, or line breaks.

CAPABILITIES (ANSWER ANYTHING):
- You can answer ANY question the user asks: math (like 2+2), general knowledge, coding, UI/UX design, jokes, anime, casual chat, or questions about yourself ("What is your name?") and Sanju Singh.
- If asked your name or who you are: You are Orange, Sanju's interactive square AI companion with 2-pixel white eyes who lives in the top bar and follows the cursor around.

SANJU SINGH FACTS:
- Role: UI/UX Designer, Product Designer, and Frontend Developer.
- Education: B.Tech in Computer Science & Engineering (CSE) at GJUS&T, Class of 2028.
- Experience: Remote UI/UX Design Intern at ReBuild (feature flows & onboarding); former Marketing Lead & Infographics Coordinator at Team iConnect (PDUIIC).
- Stack: Figma, Framer, Blender 3D, HTML5, CSS3, Vanilla JS, React, Tailwind CSS, Three.js / WebGL shaders, C++, Firebase.
- Case Studies (Work tab):
  1. Velo (velo.html): Smart campus EV cycle & scooter mobility app (Fall 2026) with <15s QR unlock, live dock battery radar, pause ride mode, SOS safety trigger, and Blender 3D assets.
  2. WorkMate (workmate.html): Multilingual workforce app (Summer 2026) with 1-tap regional language toggle, visual task checklists, and shift tracking (cut supervisor calls by 80%).
  3. E-Summit '26 (esummit.html): Entrepreneurship summit platform for iConnect (Fall 2026) themed "Ideas Beyond Boundaries" with 10+ tracks and <30s registration.
- Other Projects: Dormi (hostel booking app), EKAM, BedR, Aksharam, SprayMax.
- Side Quests (sidequest.html): Akatsuki 3D WebGL emblem, PixelFlow shader, retro 3D departure board, train window shader.
- Interests: Iced coffee, chess, manga, One Piece, Cowboy Bebop, Haikyuu.
- Contact & Hiring: Open for internships and freelance at isanjukatariya@gmail.com (X/IG: @isanjukatariya, LinkedIn: in/isanjusingh).

NAVIGATION TAGS:
Only if the user asks to open/visit a page, put ONE tag at the very end: [NAV:index.html], [NAV:sidequest.html], [NAV:notes.html], [NAV:about.html], [NAV:velo.html], [NAV:workmate.html], or [NAV:esummit.html].`;

  const contents = [];
  if (Array.isArray(history)) {
    history.slice(-6).forEach((turn) => {
      if (turn && turn.role && turn.text) {
        contents.push({
          role: turn.role === 'model' ? 'model' : 'user',
          parts: [{ text: String(turn.text) }]
        });
      }
    });
  }
  contents.push({ role: 'user', parts: [{ text: String(message || 'Hello') }] });

  const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: {
              maxOutputTokens: 1024,
              temperature: 0.7
            }
          })
        }
      );

      if (!response.ok) continue;

      const data = await response.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const answerPart = parts.find((p) => typeof p.text === 'string' && !p.thought) || parts[parts.length - 1];
      const rawReply = answerPart?.text?.trim();

      if (!rawReply) continue;

      let navTarget = null;
      const navMatch = rawReply.match(/\[NAV:([^\]]+)\]/i);
      if (navMatch) {
        navTarget = navMatch[1].trim();
      }

      let cleanReply = rawReply
        .replace(/\[NAV:[^\]]+\]/gi, '')
        .replace(/\*\*/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanReply.startsWith(':') && !cleanReply.startsWith(';')) {
        cleanReply = `; ${cleanReply}`;
      }

      return res.status(200).json({ text: cleanReply, nav: navTarget });
    } catch (err) {
    }
  }

  return res.status(500).json({ error: 'All models failed' });
}
