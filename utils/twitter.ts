// Twitter 相关工具函数

export const createTwitterShareUrl = (
  text: string,
  url?: string,
  hashtags?: string[]
): string => {
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
  connected: (username: string) => 
    `刚刚在 @AimonicaBrands 上连接了我的 Twitter 账户 @${username}！🚀 #AIMonica #Web3`,
  staked: (amount: string, token: string) =>
    `在 @AimonicaBrands 上质押了 ${amount} ${token}！💎 #AIMonica #Staking`,
  nft: (nftName: string) =>
    `在 @AimonicaBrands 上铸造了 NFT "${nftName}"！🎨 #AIMonica #NFT`,
  general: () => `正在使用 @AimonicaBrands 探索 Web3！🌟 #AIMonica #Web3`
}; 