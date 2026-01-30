import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    pages: {
        signIn: '/', // Using the home page as login page
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user

            // Protect dashboard routes
            // Note: We'll implement specific role-based protection in the layout/page components
            // or Middleware but here we just ensure they are logged in.
            // We are not strictly protecting routes here yet to avoid infinite loops during setup
            // but the middleware will use this `authorized` callback.

            return true; // We will handle redirection logic in the middleware explicitly or page components
        },
        async session({ session, token }) {
            if (token.sub && session.user) {
                session.user.id = token.sub
            }
            if (token.role && session.user) {
                session.user.role = token.role as any
            }
            if (token.university_id && session.user) {
                session.user.university_id = token.university_id as string
            }
            if (token.permissions && session.user) {
                session.user.permissions = token.permissions as string[]
            }
            if (token.department_id && session.user) {
                session.user.department_id = token.department_id as number
            }
            return session
        },
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role
                token.university_id = user.university_id
                token.permissions = user.permissions
                token.department_id = user.department_id
            }
            return token
        }
    },
    providers: [], // Configured in auth.ts
} satisfies NextAuthConfig
