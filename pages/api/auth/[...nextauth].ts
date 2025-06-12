import NextAuth from 'next-auth'
import TwitterProvider from 'next-auth/providers/twitter'

interface TwitterProfile {
  data?: {
    id: string
    username: string
    name: string
    profile_image_url?: string
  }
  // Twitter API v2 直接返回的格式
  id?: string
  username?: string
  name?: string
  profile_image_url?: string
}

export default NextAuth({
  providers: [
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: "2.0", // Twitter OAuth 2.0
    })
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // 调试信息
      console.log('JWT Callback - Account:', account ? 'Present' : 'None');
      console.log('JWT Callback - Profile:', profile ? 'Present' : 'None');
      
      if (account) {
        console.log('Account provider:', account.provider);
        console.log('Account type:', account.type);
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      
      if (profile) {
        console.log('Profile data:', JSON.stringify(profile, null, 2));
        const twitterProfile = profile as TwitterProfile
        
        // Twitter API v2 可能返回两种格式
        const username = twitterProfile.data?.username || twitterProfile.username
        const id = twitterProfile.data?.id || twitterProfile.id
        
        token.twitterUsername = username
        token.twitterId = id
        
        console.log('Extracted username:', username);
        console.log('Extracted id:', id);
        console.log('Profile structure check:', {
          hasData: !!twitterProfile.data,
          hasDirectUsername: !!twitterProfile.username,
          hasDirectId: !!twitterProfile.id
        });
      }
      
      console.log('Final token:', { 
        hasAccessToken: !!token.accessToken,
        hasUsername: !!token.twitterUsername,
        hasId: !!token.twitterId 
      });
      
      return token
    },
    async session({ session, token }) {
      console.log('Session Callback - Token:', {
        hasAccessToken: !!token.accessToken,
        hasUsername: !!token.twitterUsername,
        hasId: !!token.twitterId
      });
      
      // 发送Twitter信息到客户端
      session.accessToken = token.accessToken as string
      session.refreshToken = token.refreshToken as string
      session.twitterUsername = token.twitterUsername as string
      session.twitterId = token.twitterId as string
      
      console.log('Final session:', {
        hasAccessToken: !!session.accessToken,
        hasUsername: !!session.twitterUsername,
        hasId: !!session.twitterId
      });
      
      return session
    },
    async redirect({ url, baseUrl }) {
      // 自定义重定向逻辑
      if (url.startsWith("/")) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl + '/demo'
    }
  },
  events: {
    async signIn({ user, account, profile }) {
      console.log('Twitter登录成功:', { user, account, profile })
    },
    async signOut({ token }) {
      console.log('Twitter登出:', token)
    }
  },
  pages: {
    error: '/demo', // 出错时重定向到demo页面
  },
  debug: process.env.NODE_ENV === 'development', // 开发环境开启调试
  secret: process.env.NEXTAUTH_SECRET,
}) 