import NextAuth from 'next-auth'
import TwitterProvider from 'next-auth/providers/twitter'

interface TwitterProfile {
  id: string
  username: string
  name: string
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
      // 保存Twitter信息到token
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
      }
      if (profile) {
        const twitterProfile = profile as TwitterProfile
        token.twitterUsername = twitterProfile.username
        token.twitterId = twitterProfile.id
      }
      return token
    },
    async session({ session, token }) {
      // 发送Twitter信息到客户端
      session.accessToken = token.accessToken as string
      session.refreshToken = token.refreshToken as string
      session.twitterUsername = token.twitterUsername as string
      session.twitterId = token.twitterId as string
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