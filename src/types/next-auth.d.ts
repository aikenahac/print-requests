import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    credentialVersion?: number
  }
  interface Session {
    user: DefaultSession["user"] & { id: string; credentialVersion: number }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string
    credentialVersion?: number
  }
}
