
import { db } from "./lib/db"

async function main() {
    console.log("Checking Form Templates...")
    const forms = await db.form_templates.findMany({
        select: {
            form_id: true,
            name: true,
            is_active: true,
            audience_config: true,
            request_type_id: true
        }
    })
    console.log(JSON.stringify(forms, null, 2))

    console.log("\nChecking Users and Roles...")
    const users = await db.users.findMany({
        take: 5,
        include: {
            roles: true
        }
    })
    console.log(JSON.stringify(users.map(u => ({
        id: u.university_id,
        role: u.roles.role_name,
        dept: u.department_id
    })), null, 2))
}

main()
    .catch(e => console.error(e))
    .finally(async () => await db.$disconnect())
