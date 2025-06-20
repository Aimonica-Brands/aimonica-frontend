export const isDevelopment = process.env.NEXT_PUBLIC_APP_ENV === 'development';

/**环境配置 */
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

/**获取当前环境 */
export const getCurrentEnv = () => ({
  isDev: isDevelopment,
  url: envConfig.app.url,
  defaultPage: envConfig.app.defaultPage,
  twitterConfigured: envConfig.twitter.configured
});

/**创建Twitter分享链接 */
export const createTwitterShareUrl = (text: string, url?: string, hashtags?: string[]): string => {
  const params = new URLSearchParams();
  params.append('text', text);
  if (url) params.append('url', url);
  if (hashtags?.length) params.append('hashtags', hashtags.join(','));
  return `https://twitter.com/intent/tweet?${params.toString()}`;
};

/**分享到Twitter */
export const shareOnTwitter = (text: string, url?: string): void => {
  const shareUrl = createTwitterShareUrl(text, url);
  window.open(shareUrl, '_blank', 'width=550,height=420');
};

/**创建分享消息 */
export const createShareMessages = {
  connected: (username: string) => `Just connected my Twitter account @${username} on @AimonicaBrands! 🚀 #AIMonica #Web3`,
  staked: (amount: string, token: string) => `Staked ${amount} ${token} on @AimonicaBrands! 💎 #AIMonica #Staking`,
  nft: (nftName: string) => `Minted NFT "${nftName}" on @AimonicaBrands! 🎨 #AIMonica #NFT`,
  general: () => `Exploring Web3 on @AimonicaBrands! 🌟 #AIMonica #Web3`
};
