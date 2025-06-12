import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const debug = {
    cookies: {
      sessionToken: !!req.cookies['next-auth.session-token'],
      csrfToken: !!req.cookies['next-auth.csrf-token'],
      callbackUrl: req.cookies['next-auth.callback-url'] || null,
      allCookies: Object.keys(req.cookies).filter(key => key.startsWith('next-auth'))
    },
    headers: {
      host: req.headers.host,
      userAgent: req.headers['user-agent'],
      referer: req.headers.referer
    },
    query: req.query,
    timestamp: new Date().toISOString(),
    instructions: {
      note: '如果看到sessionToken为true但前端没有用户信息，检查服务器日志中的JWT和Session回调输出'
    }
  };

  res.status(200).json(debug);
} 