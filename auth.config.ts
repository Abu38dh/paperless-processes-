import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    pages: {
        signIn: '/', // Using the home page as login page
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isAdminRoute = nextUrl.pathname.startsWith('/admin')

            if (!isLoggedIn) return false

            if (isAdminRoute) {
                // فقط المدير يدخل مسارات /admin
                return auth?.user?.role === 'admin'
            }

            return true
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
