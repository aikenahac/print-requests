import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { eq, sql } from "drizzle-orm"
import { db } from "@/db"
import { users } from "@/db/schema"
import { verifyPassword } from "@/lib/password"

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in" },
  providers: [Credentials({
    credentials: { username: {}, password: {} },
    async authorize(credentials) {
      const username = typeof credentials?.username === "string" ? credentials.username.trim() : ""
      const password = typeof credentials?.password === "string" ? credentials.password : ""
      if (!username || !password) return null
      const [user] = await db.select().from(users).where(sql`lower(${users.username}) = lower(${username})`).limit(1)
      if (!user || !(await verifyPassword(password, user.passwordHash))) return null
      return { id: user.id, name: user.username, credentialVersion: user.credentialVersion }
    },
  })],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.credentialVersion = user.credentialVersion
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.userId ?? "")
        session.user.credentialVersion = Number(token.credentialVersion ?? -1)
      }
      return session
    },
  },
})

export async function getActor() {
  const session = await auth()
  if (!session?.user?.id) return null
  const [user] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1)
  if (!user || user.credentialVersion !== session.user.credentialVersion) return null
  return user
}
