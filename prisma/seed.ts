import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting database seeding for presentation...')

    console.log('🧹 Clearing existing database tables...')
    // Order of deletion to avoid foreign key constraints:
    await prisma.absence_records.deleteMany()
    await prisma.absences.deleteMany()
    await prisma.attachments.deleteMany()
    await prisma.request_actions.deleteMany()
    await prisma.delegations.deleteMany()
    await prisma.requests.deleteMany()
    await prisma.audit_logs.deleteMany()
    await prisma.notifications.deleteMany()
    
    // Break circular references:
    await prisma.users.updateMany({
        data: {
            department_id: null,
            level_id: null,
            current_term_id: null
        }
    })
    await prisma.colleges.updateMany({
        data: {
            dean_id: null
        }
    })
    await prisma.departments.updateMany({
        data: {
            manager_id: null
        }
    })

    // Delete workflow steps first (they reference users & roles)
    await prisma.workflow_steps.deleteMany()
    
    // Delete form templates and request types (they reference workflows & requests)
    await prisma.form_templates.deleteMany()
    await prisma.request_types.deleteMany()
    
    // Delete workflows
    await prisma.workflows.deleteMany()

    // Delete subjects, level terms, levels (reference departments & users)
    await prisma.subjects.deleteMany()
    await prisma.level_terms.deleteMany()
    await prisma.levels.deleteMany()
    
    // Delete departments and colleges
    await prisma.departments.deleteMany()
    await prisma.colleges.deleteMany()
    
    // Now we can safely delete users
    await prisma.users.deleteMany()
    
    // Delete terms
    await prisma.terms.deleteMany()
    
    // Delete roles
    await prisma.roles.deleteMany()

    console.log('✨ Database cleared successfully.')

    // 1. Seed Roles
    console.log('1. Seeding roles...')
    const rolesData = [
        { role_name: 'student', permissions: [] },
        { role_name: 'employee', permissions: ['view_requests', 'edit_requests'] },
        { role_name: 'admin', permissions: ['all'] },
        { role_name: 'dean', permissions: ['approve_college_requests'] },
        { role_name: 'head_of_department', permissions: ['approve_department_requests'] },
    ]

    const roles: Record<string, any> = {}
    for (const role of rolesData) {
        const r = await prisma.roles.create({
            data: {
                role_name: role.role_name,
                permissions: role.permissions,
            },
        })
        roles[role.role_name] = r
        console.log(`- Created role: ${r.role_name}`)
    }

    const passwordHash = await bcrypt.hash('123', 10)

    // 2. Seed Admin User Only
    console.log('2. Seeding admin user...')
    const adminUser = await prisma.users.create({
        data: {
            university_id: 'admin',
            password_hash: passwordHash,
            full_name: 'مدير النظام',
            role_id: roles.admin.role_id,
            email: 'admin@university.edu.sa',
            phone: '0500000000',
        }
    })
    console.log(`- Created admin user: ${adminUser.full_name} (${adminUser.university_id})`)

    // 3. Seed Colleges
    console.log('3. Seeding colleges...')
    const collegeMed = await prisma.colleges.create({
        data: { name: 'كلية الطب و العلوم الصحية', show_absences: true }
    })
    const collegeDent = await prisma.colleges.create({
        data: { name: 'كلية طب الأسنان', show_absences: true }
    })
    const collegeEng = await prisma.colleges.create({
        data: { name: 'كلية الهندسة و تقنية المعلومات', show_absences: true }
    })
    const collegeAdmin = await prisma.colleges.create({
        data: { name: 'كلية العلوم الإدارية', show_absences: true }
    })
    console.log('- Colleges created successfully.')

    // 4. Seed Departments
    console.log('4. Seeding departments...')
    
    // Medicine & Health Sciences
    const deptMedGeneral = await prisma.departments.create({
        data: { dept_name: 'بكالوريوس طب عام وجراحة', college_id: collegeMed.college_id, is_academic: true }
    })
    const deptMedLabs = await prisma.departments.create({
        data: { dept_name: 'بكالوريوس مختبرات طبية', college_id: collegeMed.college_id, is_academic: true }
    })
    const deptMedPharma = await prisma.departments.create({
        data: { dept_name: 'بكالوريوس صيدلة', college_id: collegeMed.college_id, is_academic: true }
    })
    const deptMedHearing = await prisma.departments.create({
        data: { dept_name: 'بكالوريوس السمع و النطق', college_id: collegeMed.college_id, is_academic: true }
    })
    const deptMedTherapy = await prisma.departments.create({
        data: { dept_name: 'بكالوريوس العلاج الطبيعي', college_id: collegeMed.college_id, is_academic: true }
    })

    // Dentistry
    const deptDentOral = await prisma.departments.create({
        data: { dept_name: 'بكالوريوس طب وجراحة الفم والاسنان', college_id: collegeDent.college_id, is_academic: true }
    })

    // Engineering & IT
    const deptEngCyber = await prisma.departments.create({
        data: { dept_name: 'بكالوريوس الأمن السيبراني', college_id: collegeEng.college_id, is_academic: true }
    })
    const deptEngAI = await prisma.departments.create({
        data: { dept_name: 'بكالوريوس الذكاء الاصطناعي', college_id: collegeEng.college_id, is_academic: true }
    })
    const deptEngIT = await prisma.departments.create({
        data: { dept_name: 'بكالوريوس تقنية معلومات', college_id: collegeEng.college_id, is_academic: true }
    })
    const deptEngMining = await prisma.departments.create({
        data: { dept_name: 'بكالوريوس هندسة تعدين', college_id: collegeEng.college_id, is_academic: true }
    })
    const deptEngInterior = await prisma.departments.create({
        data: { dept_name: 'بكالوريوس هندسة التصميم الداخلي', college_id: collegeEng.college_id, is_academic: true }
    })
    const deptEngCivil = await prisma.departments.create({
        data: { dept_name: 'بكالوريوس هندسة مدنية', college_id: collegeEng.college_id, is_academic: true }
    })
    const deptEngArch = await prisma.departments.create({
        data: { dept_name: 'بكالوريوس هندسة معمارية', college_id: collegeEng.college_id, is_academic: true }
    })

    // Administrative Sciences
    const deptAdminBusiness = await prisma.departments.create({
        data: { dept_name: 'بكالوريوس إدارة اعمال', college_id: collegeAdmin.college_id, is_academic: true }
    })
    const deptAdminAccounting = await prisma.departments.create({
        data: { dept_name: 'بكالوريوس محاسبة', college_id: collegeAdmin.college_id, is_academic: true }
    })
    console.log('- Departments created successfully.')

    // 5. Seed academic levels, terms and subjects
    console.log('5. Seeding academic levels, terms, and subjects...')
    const depts = [
        { dept: deptMedGeneral, subjects: [{ name: 'علم التشريح', code: 'ANA101' }, { name: 'علم وظائف الأعضاء', code: 'PHY101' }] },
        { dept: deptMedLabs, subjects: [{ name: 'مقدمة في المختبرات الطبية', code: 'LAB101' }] },
        { dept: deptMedPharma, subjects: [{ name: 'مبادئ علم الصيدلة', code: 'PHA101' }] },
        { dept: deptMedHearing, subjects: [{ name: 'مبادئ علم السمع والنطق', code: 'HEA101' }] },
        { dept: deptMedTherapy, subjects: [{ name: 'العلاج الطبيعي الأساسي', code: 'THE101' }] },
        { dept: deptDentOral, subjects: [{ name: 'تشريح الأسنان', code: 'DEN101' }] },
        { dept: deptEngCyber, subjects: [{ name: 'مقدمة في الأمن السيبراني', code: 'CYB101' }, { name: 'أمن الشبكات', code: 'CYB102' }] },
        { dept: deptEngAI, subjects: [{ name: 'مقدمة في الذكاء الاصطناعي', code: 'AI101' }, { name: 'تعلم الآلة', code: 'AI102' }] },
        { dept: deptEngIT, subjects: [{ name: 'مقدمة في تقنية المعلومات', code: 'IT101' }, { name: 'تصميم مواقع الويب', code: 'IT102' }] },
        { dept: deptEngMining, subjects: [{ name: 'هندسة التعدين والمناجم', code: 'MIN101' }] },
        { dept: deptEngInterior, subjects: [{ name: 'مبادئ التصميم الداخلي', code: 'INT101' }] },
        { dept: deptEngCivil, subjects: [{ name: 'الهندسة المدنية الأساسية', code: 'CIV101' }] },
        { dept: deptEngArch, subjects: [{ name: 'مقدمة في الهندسة المعمارية', code: 'ARC101' }] },
        { dept: deptAdminBusiness, subjects: [{ name: 'مبادئ إدارة الأعمال', code: 'BUS101' }, { name: 'السلوك التنظيمي', code: 'BUS102' }] },
        { dept: deptAdminAccounting, subjects: [{ name: 'مبادئ المحاسبة', code: 'ACC101' }, { name: 'المحاسبة المالية', code: 'ACC102' }] },
    ]

    const levelNames = [
        'المستوى الأول',
        'المستوى الثاني',
        'المستوى الثالث',
        'المستوى الرابع',
        'المستوى الخامس'
    ]

    for (const item of depts) {
        // Dentistry gets 5 levels, others get 4
        const numLevels = item.dept.department_id === deptDentOral.department_id ? 5 : 4;
        
        for (let i = 0; i < numLevels; i++) {
            const level = await prisma.levels.create({
                data: {
                    name: levelNames[i],
                    order: i + 1,
                    department_id: item.dept.department_id,
                    show_absences: true
                }
            })
            
            const term1 = await prisma.level_terms.create({
                data: {
                    level_id: level.level_id,
                    name: 'الفصل الدراسي الأول',
                    order: 1
                }
            })
            
            const term2 = await prisma.level_terms.create({
                data: {
                    level_id: level.level_id,
                    name: 'الفصل الدراسي الثاني',
                    order: 2
                }
            })
            
            // Add specific subjects for Level 1, and generic subjects for others
            if (i === 0) {
                for (const sub of item.subjects) {
                    await prisma.subjects.create({
                        data: {
                            term_id: term1.term_id,
                            name: sub.name,
                            code: sub.code
                        }
                    })
                }
            } else {
                await prisma.subjects.create({
                    data: {
                        term_id: term1.term_id,
                        name: `مادة تجريبية (${levelNames[i]})`,
                        code: `SUB-${item.dept.department_id}-${i}`
                    }
                })
            }
        }
    }
    console.log('- Levels, terms, and subjects seeded successfully.')

    // 6. Seed General Terms (Semesters)
    console.log('6. Seeding general terms...')
    const currentSemester = await prisma.terms.create({
        data: {
            name: 'الفصل الدراسي الأول 2026',
            start_date: new Date('2026-09-01'),
            end_date: new Date('2027-01-31'),
        },
    })
    console.log(`- Created general term: ${currentSemester.name}`)

    // 7. Seed Workflows and Workflow Steps
    console.log('7. Seeding workflows...')
    const workflowExcuse = await prisma.workflows.create({
        data: {
            name: 'مسار طلب عذر غياب',
            is_active: true,
        },
    })

    const excuseStep1 = await prisma.workflow_steps.create({
        data: {
            workflow_id: workflowExcuse.workflow_id,
            order: 1,
            name: 'مراجعة شؤون الطلاب',
            approver_role_id: roles.employee.role_id,
            sla_hours: 24,
            is_final: false,
        },
    })
    const excuseStep2 = await prisma.workflow_steps.create({
        data: {
            workflow_id: workflowExcuse.workflow_id,
            order: 2,
            name: 'اعتماد عميد الكلية الكلي',
            approver_role_id: roles.dean.role_id,
            sla_hours: 48,
            is_final: true,
        },
    })

    const workflowPostpone = await prisma.workflows.create({
        data: {
            name: 'مسار طلب تأجيل دراسي',
            is_active: true,
        },
    })

    const postponeStep1 = await prisma.workflow_steps.create({
        data: {
            workflow_id: workflowPostpone.workflow_id,
            order: 1,
            name: 'مراجعة شؤون الطلاب',
            approver_role_id: roles.employee.role_id,
            sla_hours: 24,
            is_final: false,
        },
    })
    const postponeStep2 = await prisma.workflow_steps.create({
        data: {
            workflow_id: workflowPostpone.workflow_id,
            order: 2,
            name: 'اعتماد عميد الكلية',
            approver_role_id: roles.dean.role_id,
            sla_hours: 48,
            is_final: true,
        },
    })
    console.log('- Workflows and steps created successfully.')

    // 8. Seed Request Types and Form Templates
    console.log('8. Seeding Request Types and Form Templates...')
    const requestTypeExcuse = await prisma.request_types.create({
        data: {
            key: 'absence_excuse',
            label: 'طلب عذر غياب',
            workflow_id: workflowExcuse.workflow_id,
        },
    })

    const excuseSchema = [
        {
            id: '1',
            label: 'سبب تقديم العذر',
            key: 'excuse_reason',
            type: 'longtext',
            required: true,
            placeholder: 'اكتب تفاصيل العذر والظرف الصحي أو الشخصي هنا بالتفصيل...',
        },
        {
            id: '2',
            label: 'تاريخ الغياب عن المحاضرات',
            key: 'excuse_date',
            type: 'date',
            required: true,
        },
        {
            id: '4',
            label: 'إرفاق التقرير الطبي أو المستند الرسمي للغياب',
            key: 'medical_report',
            type: 'file',
            required: true,
        }
    ]

    await prisma.form_templates.create({
        data: {
            request_type_id: requestTypeExcuse.type_id,
            name: 'نموذج طلب عذر غياب رسمي',
            is_active: true,
            audience_config: { student: true, employee: false },
            schema: excuseSchema as any,
            pdf_template: '<h1>طلب عذر غياب رسمي</h1><p>نفيدكم بأن الطالب {{users.full_name}} قد تقدم بعذر طبي مقبول لتاريخ {{submission_data.excuse_date}}.</p>',
        },
    })

    const requestTypePostpone = await prisma.request_types.create({
        data: {
            key: 'postpone_semester',
            label: 'طلب تأجيل دراسي',
            workflow_id: workflowPostpone.workflow_id,
        },
    })

    const postponeSchema = [
        {
            id: '1',
            label: 'الفصل الدراسي المراد تأجيله',
            key: 'postpone_term',
            type: 'select',
            required: true,
            options: [
                { id: '1', label: 'الفصل الدراسي الأول 2026' }
            ]
        },
        {
            id: '2',
            label: 'مبررات طلب التأجيل الأكاديمي',
            key: 'postpone_reason',
            type: 'longtext',
            required: true,
            placeholder: 'يرجى كتابة أسباب الرغبة في تأجيل الفصل الدراسي...',
        }
    ]

    await prisma.form_templates.create({
        data: {
            request_type_id: requestTypePostpone.type_id,
            name: 'نموذج طلب تأجيل دراسي',
            is_active: true,
            audience_config: { student: true, employee: false },
            schema: postponeSchema as any,
            pdf_template: '<h1>قرار تأجيل دراسي</h1><p>بناءً على الطلب المقدم، تقرر موافقة الكلية على تأجيل الدراسة للطالب {{users.full_name}} للفصل الدراسي الموضح.</p>',
        },
    })
    console.log('- Form templates and request types created successfully.')

    console.log('🎉 Seeding finished successfully.')
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
