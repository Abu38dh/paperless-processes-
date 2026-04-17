const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const req = await prisma.requests.findFirst({
        orderBy: { request_id: 'desc' },
        include: { form_templates: true }
    });
    console.log("SUBMISSION_DATA:", JSON.stringify(req.submission_data, null, 2));
    console.log("SCHEMA:", JSON.stringify(req.form_templates.schema, null, 2));
    console.log("TYPE:", typeof req.submission_data);
}
main().finally(() => prisma.$disconnect());
