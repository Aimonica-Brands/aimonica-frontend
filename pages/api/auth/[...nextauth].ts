import NextAuth from 'next-auth';
import TwitterProvider from 'next-auth/providers/twitter';

interface TwitterProfile {
  data?: {
    id: string;
    username: string;
    name: string;
    profile_image_url?: string;
  };
  // Twitter API v2 直接返回的格式
  id?: string;
  username?: string;
  name?: string;
  profile_image_url?: string;
}

export default NextAuth({
  providers: [
    TwitterProvider({
      clientId: process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID!,
      clientSecret: process.env.NEXT_PUBLIC_TWITTER_CLIENT_SECRET!,
      version: '2.0', // Twitter OAuth 2.0
      authorization: {
        params: {
          redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/twitter`
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }

      if (profile) {
        const twitterProfile = profile as TwitterProfile;
        const username = twitterProfile.data?.username || twitterProfile.username;
        const id = twitterProfile.data?.id || twitterProfile.id;

        token.twitterUsername = username;
        token.twitterId = id;
      }

      return token;
    },
    async session({ session, token }) {
      console.log('session', session);
      console.log('token', token);
      session.accessToken = token.accessToken as string;
      session.refreshToken = token.refreshToken as string;
      session.twitterUsername = token.twitterUsername as string;
      session.twitterId = token.twitterId as string;
      session.profile_image_url = token.profile_image_url as string;

      return session;
    },
    async redirect({ url, baseUrl }) {
      const redirectPage = '/';

      if (url.startsWith('/')) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl + redirectPage;
    }
  },
  pages: {
    error: '/'
  },
  secret: process.env.NEXT_PUBLIC_AUTH_SECRET
});
