import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // We only accept POST
  if (req.method !== 'POST' && req.method !== 'OPTIONS') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Set CORS headers so Render can call it
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { sender, password, to, subject, html, text } = req.body;

    if (!sender || !password || !to || !subject) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: sender,
        pass: password,
      },
    });

    const info = await transporter.sendMail({
      from: `"SuperMart POS" <${sender}>`,
      to,
      subject,
      text,
      html,
    });

    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Email error:', error);
    return res.status(500).json({ error: error.message });
  }
}
