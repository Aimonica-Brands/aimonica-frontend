// 环境配置工具

export const isDevelopment = process.env.NEXT_PUBLIC_APP_ENV === 'development';

export const envConfig = {
  environment: process.env.NEXT_PUBLIC_APP_ENV,

  app: {
    url: process.env.NEXT_PUBLIC_AUTH_URL,
    defaultPage: '/demo'
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
