import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { error } = req.query;
  
  const errorMessages: Record<string, string> = {
    OAuthCallback: 'OAuth回调错误 - 请检查Twitter应用配置中的回调URL',
    Configuration: '配置错误 - 请检查环境变量',
    AccessDenied: '访问被拒绝 - 用户取消了授权',
    Verification: '验证错误 - 请重试',
    Default: '认证过程中发生未知错误'
  };
  
  const message = errorMessages[error as string] || errorMessages.Default;
  
  res.status(200).json({
    error: error as string,
    message,
    troubleshooting: {
      OAuthCallback: [
        '1. 确认Twitter应用中的回调URL设置',
        '2. 检查NEXTAUTH_URL环境变量是否设置正确',
        '3. 确认Twitter应用已启用OAuth 2.0'
      ],
      Configuration: [
        '1. 检查.env文件是否存在',
        '2. 确认所有必需的环境变量都已设置',
        '3. 重启开发服务器'
      ]
    }
  });
} 