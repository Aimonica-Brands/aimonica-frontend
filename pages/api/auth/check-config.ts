import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const hasTwitterConfig = !!(
      process.env.TWITTER_CLIENT_ID &&
      process.env.TWITTER_CLIENT_SECRET &&
      process.env.NEXTAUTH_SECRET
    );

    const hasNextAuthUrl = process.env.NEXTAUTH_URL;

    res.status(200).json({
      configured: hasTwitterConfig && hasNextAuthUrl,
      details: {
        twitterClientId: !!process.env.TWITTER_CLIENT_ID,
        twitterClientSecret: !!process.env.TWITTER_CLIENT_SECRET,
        nextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        nextAuthUrl: !!process.env.NEXTAUTH_URL
      },
      message: hasTwitterConfig && hasNextAuthUrl ? 'Twitter配置完整' : '请检查环境变量配置'
    });
  } catch (error) {
    res.status(500).json({
      error: '配置检查失败',
      configured: false
    });
  }
}
