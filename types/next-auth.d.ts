import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session extends DefaultSession {
    accessToken?: string
    refreshToken?: string
    twitterUsername?: string
    twitterId?: string
    profile_image_url?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    twitterUsername?: string
    twitterId?: string
    profile_image_url?: string
  }
} 