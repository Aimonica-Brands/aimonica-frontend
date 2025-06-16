// 环境配置工具

export const isDevelopment = process.env.NEXT_PUBLIC_APP_ENV === 'development';

export const envConfig = {
  environment: process.env.NEXT_PUBLIC_APP_ENV,

  app: {
    url: process.env.NEXTAUTH_URL,
    defaultPage: '/'
  },

  twitter: {
    configured: !!(
      process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID &&
      process.env.NEXT_PUBLIC_TWITTER_CLIENT_SECRET &&
      process.env.NEXT_PUBLIC_AUTH_SECRET
    )
  },

  debug: isDevelopment
};

export const getCurrentEnv = () => ({
  isDev: isDevelopment,
  url: envConfig.app.url,
  defaultPage: envConfig.app.defaultPage,
  twitterConfigured: envConfig.twitter.configured
});

// Twitter 相关工具函数

export const createTwitterShareUrl = (text: string, url?: string, hashtags?: string[]): string => {
  const params = new URLSearchParams();
  params.append('text', text);
  if (url) params.append('url', url);
  if (hashtags?.length) params.append('hashtags', hashtags.join(','));
  return `https://twitter.com/intent/tweet?${params.toString()}`;
};

export const shareOnTwitter = (text: string, url?: string): void => {
  const shareUrl = createTwitterShareUrl(text, url);
  window.open(shareUrl, '_blank', 'width=550,height=420');
};

export const createShareMessages = {
  connected: (username: string) => `刚刚在 @AimonicaBrands 上连接了我的 Twitter 账户 @${username}！🚀 #AIMonica #Web3`,
  staked: (amount: string, token: string) => `在 @AimonicaBrands 上质押了 ${amount} ${token}！💎 #AIMonica #Staking`,
  nft: (nftName: string) => `在 @AimonicaBrands 上铸造了 NFT "${nftName}"！🎨 #AIMonica #NFT`,
  general: () => `正在使用 @AimonicaBrands 探索 Web3！🌟 #AIMonica #Web3`
};
