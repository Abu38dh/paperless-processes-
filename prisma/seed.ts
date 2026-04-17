import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

// @ts-ignore
const prisma = new PrismaClient({})

async function main() {
    console.log('🌱 Starting seeding...')

    // 1. Seed Roles
    const rolesData = [
        { role_name: 'student', permissions: [] },
        { role_name: 'employee', permissions: ['view_requests', 'edit_requests'] },
        { role_name: 'admin', permissions: ['all'] },
        { role_name: 'dean', permissions: ['approve_college_requests'] },
        { role_name: 'head_of_department', permissions: ['approve_department_requests'] },
    ]

    for (const role of rolesData) {
        const r = await prisma.roles.upsert({
            where: { role_name: role.role_name },
            update: {},
            create: {
                role_name: role.role_name,
                permissions: role.permissions,
            },
        })
        console.log(`Created role: ${r.role_name}`)
    }

    // Fetch roles to get IDs
    const adminRole = await prisma.roles.findUnique({ where: { role_name: 'admin' } })

    if (!adminRole) {
        throw new Error('Roles not created successfully')
    }

    // 2. Seed Users
    const passwordHash = await bcrypt.hash('123', 10)

    // Admin
    await prisma.users.upsert({
        where: { university_id: 'admin' },
        update: {},
        create: {
            university_id: 'admin',
            password_hash: passwordHash,
            full_name: 'مدير النظام',
            role_id: adminRole.role_id,
        },
    })

    console.log('✅ Seeding finished.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
