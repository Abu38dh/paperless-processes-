
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    try {
        const users = await prisma.users.findMany({
            select: {
                university_id: true,
                full_name: true,
                role_id: true,
                password_hash: true
            }
        })
        console.log('Found users:', users.length)
        users.forEach(u => {
            console.log(`User: ${u.university_id}, Hash length: ${u.password_hash?.length}`)
        })
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

main()
