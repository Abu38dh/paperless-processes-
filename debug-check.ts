
import { db } from "./lib/db";

async function main() {
    try {
        console.log("=== DIAGNOSTIC START ===");

        // 1. Check the logged-in user (assuming the user in screenshots is 'grfsfdgfd' or similar, but I'll list first few employees)
        console.log("\n--- Checking Users (Role: Employee) ---");
        const employees = await db.users.findMany({
            where: {
                roles: {
                    role_name: {
                        contains: 'employee',
                        mode: 'insensitive'
                    }
                }
            },
            include: {
                roles: true,
                departments_users_department_idTodepartments: true
            },
            take: 3
        });

        employees.forEach(u => {
            console.log(`User: ${u.full_name} (${u.university_id})`);
            console.log(`  Role: ${u.roles.role_name}`);
            console.log(`  Dept ID: ${u.department_id}`);
            console.log(`  Dept Name: ${u.departments_users_department_idTodepartments?.dept_name || 'N/A'}`);
        });

        // 2. Check Active Forms and their Config
        console.log("\n--- Checking Active Forms ---");
        const forms = await db.form_templates.findMany({
            where: { is_active: true }
        });

        forms.forEach(f => {
            console.log(`Form: ${f.name} (ID: ${f.form_id})`);
            console.log(`  Audience Config:`, JSON.stringify(f.audience_config));
        });

        console.log("\n=== DIAGNOSTIC END ===");

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await db.$disconnect();
    }
}

main();
