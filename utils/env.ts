// 环境配置工具

export const isDevelopment = process.env.NEXT_PUBLIC_APP_ENV === 'development';
export const isProduction = process.env.NEXT_PUBLIC_APP_ENV === 'production';

export const envConfig = {
  environment: process.env.NEXT_PUBLIC_APP_ENV,

  app: {
    url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
    defaultPage: '/demo'
  },

  twitter: {
    configured: !!(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET && process.env.NEXTAUTH_SECRET)
  },

  debug: isDevelopment
};

export const getCurrentEnv = () => ({
  isDev: isDevelopment,
  isProd: isProduction,
  url: envConfig.app.url,
  defaultPage: envConfig.app.defaultPage,
  twitterConfigured: envConfig.twitter.configured
});
