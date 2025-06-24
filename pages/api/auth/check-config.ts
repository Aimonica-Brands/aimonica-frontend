import { NextApiRequest, NextApiResponse } from 'next';
import { getCurrentEnv } from '@/pages/api/auth';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const env = getCurrentEnv();
    
    res.status(200).json({
      configured: env.twitterConfigured,
      environment: env.isDev ? 'development' : 'production',
      url: env.url,
      defaultPage: env.defaultPage,
      message: env.twitterConfigured 
        ? 'Twitter配置完整' 
        : '请检查环境变量配置'
    });
  } catch (error) {
    res.status(500).json({ 
      error: '配置检查失败',
      configured: false 
    });
  }
}
