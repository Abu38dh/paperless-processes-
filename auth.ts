import NextAuth from "next-auth"
import { authConfig } from "./auth.config"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"

export const { auth, signIn, signOut, handlers } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            async authorize(credentials) {
                try {
                    const parsedCredentials = z
                        .object({ username: z.string(), password: z.string().min(1) })
                        .safeParse(credentials)

                    if (parsedCredentials.success) {
                        const { username, password } = parsedCredentials.data

                        const user = await db.users.findUnique({
                            where: { university_id: username },
                            include: { roles: true }
                        })

                        if (!user) return null

                        // In a real app we should check is_active, but let's just return null if fail
                        if (!user.is_active) return null

                        const passwordsMatch = await bcrypt.compare(password, user.password_hash)
                        if (passwordsMatch) {
                            // Get permissions logic
                            let permissions: string[] = []
                            if ((user as any).custom_permissions) {
                                try { permissions = JSON.parse((user as any).custom_permissions) } catch { }
                            }

                            // Safety check for role
                            if (!user.roles) {
                                console.error(`User ${user.user_id} has no role assigned`)
                                return null
                            }

                            if (permissions.length === 0 && user.roles.permissions) {
                                permissions = user.roles.permissions as string[]
                            }

                            return {
                                id: user.user_id.toString(),
                                name: user.full_name,
                                university_id: user.university_id,
                                role: user.roles.role_name,
                                permissions: permissions,
                                department_id: user.department_id
                            }
                        }
                    }

                    return null
                } catch (error) {
                    console.error("Auth error:", error)
                    return null
                }
            },
        }),
    ],
})
