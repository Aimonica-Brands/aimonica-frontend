import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const host = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const fullUrl = `${protocol}://${host}`;
  
  const diagnosis = {
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      host: host,
      protocol: protocol,
      fullUrl: fullUrl,
      userAgent: req.headers['user-agent']
    },
    nextAuth: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      urlMatch: process.env.NEXTAUTH_URL === fullUrl,
      hasSecret: !!process.env.NEXTAUTH_SECRET,
      secretLength: process.env.NEXTAUTH_SECRET?.length || 0
    },
    twitter: {
      hasClientId: !!process.env.TWITTER_CLIENT_ID,
      hasClientSecret: !!process.env.TWITTER_CLIENT_SECRET,
      clientIdPreview: process.env.TWITTER_CLIENT_ID ? 
        process.env.TWITTER_CLIENT_ID.substring(0, 8) + '...' : 'None'
    },
    expectedUrls: {
      callbackUrl: `${fullUrl}/api/auth/callback/twitter`,
      errorUrl: `${fullUrl}/api/auth/error`,
      signInUrl: `${fullUrl}/api/auth/signin`
    },
    cookies: {
      sessionToken: !!req.cookies['next-auth.session-token'],
      csrfToken: !!req.cookies['next-auth.csrf-token'],
      callbackUrl: req.cookies['next-auth.callback-url'] || 'None'
    },
    recommendations: []
  };

  // 添加建议
  if (!diagnosis.nextAuth.urlMatch) {
    diagnosis.recommendations.push(
      `NEXTAUTH_URL环境变量 (${process.env.NEXTAUTH_URL}) 与当前URL (${fullUrl}) 不匹配`
    );
  }

  if (diagnosis.cookies.callbackUrl && diagnosis.cookies.callbackUrl.includes('localhost')) {
    diagnosis.recommendations.push(
      `检测到localhost回调URL在cookie中，建议清除浏览器缓存`
    );
  }

  if (diagnosis.nextAuth.secretLength < 32) {
    diagnosis.recommendations.push(
      `NEXTAUTH_SECRET长度过短 (${diagnosis.nextAuth.secretLength}字符)，建议使用32字符以上`
    );
  }

  res.status(200).json(diagnosis);
} 