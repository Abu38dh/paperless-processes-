const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Starting data migration to fix missing subjectNames...");

    // 1. Fetch all subjects for mapping
    const subjects = await prisma.$queryRawUnsafe(`SELECT subject_id, name FROM subjects`);
    const subjectMap = {};
    subjects.forEach(s => {
        subjectMap[s.subject_id] = s.name;
    });

    // 2. Fetch all requests
    const requests = await prisma.requests.findMany();
    let updateCount = 0;

    for (const req of requests) {
        if (!req.submission_data) continue;

        let data = req.submission_data;
        // In case it's a string (though Prisma often parses it)
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch(e) { continue; }
        }

        let changed = false;
        // Search for absence_picker fields
        for (const key in data) {
            const field = data[key];
            if (field && typeof field === 'object' && field.subjectId && !field.subjectName) {
                const name = subjectMap[field.subjectId];
                if (name) {
                    field.subjectName = name;
                    changed = true;
                }
            }
        }

        if (changed) {
            await prisma.requests.update({
                where: { request_id: req.request_id },
                data: { submission_data: data }
            });
            updateCount++;
            console.log(`Updated request #${req.request_id}`);
        }
    }

    console.log(`Migration complete. Updated ${updateCount} requests.`);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
