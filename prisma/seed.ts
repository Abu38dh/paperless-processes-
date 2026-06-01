import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting comprehensive database seeding...')

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
        const r = await prisma.roles.upsert({
            where: { role_name: role.role_name },
            update: {},
            create: {
                role_name: role.role_name,
                permissions: role.permissions,
            },
        })
        roles[role.role_name] = r
        console.log(`- Created/Verified role: ${r.role_name}`)
    }

    const passwordHash = await bcrypt.hash('123', 10)

    // 2. Seed Base Users (without department/level initially to avoid circular references)
    console.log('2. Seeding base users...')
    const usersToCreate = [
        { university_id: 'admin', full_name: 'مدير النظام', role_id: roles.admin.role_id },
        { university_id: 'dean1', full_name: 'د. خالد العتيبي (عميد الكلية)', role_id: roles.dean.role_id, email: 'dean@university.edu.sa' },
        { university_id: 'hod1', full_name: 'د. محمد الحربي (رئيس القسم)', role_id: roles.head_of_department.role_id, email: 'hod@university.edu.sa' },
        { university_id: 'emp1', full_name: 'أ. سارة أحمد (شؤون الطلاب)', role_id: roles.employee.role_id, email: 'emp@university.edu.sa' },
        { university_id: 'student1', full_name: 'أحمد العتيبي (طالب)', role_id: roles.student.role_id, email: 'student1@student.edu.sa' },
        { university_id: 'student2', full_name: 'فيصل الشمري (طالب)', role_id: roles.student.role_id, email: 'student2@student.edu.sa' },
        { university_id: 'student3', full_name: 'نورة القحطاني (طالبة)', role_id: roles.student.role_id, email: 'student3@student.edu.sa' },
    ]

    const seededUsers: Record<string, any> = {}
    for (const userData of usersToCreate) {
        const u = await prisma.users.upsert({
            where: { university_id: userData.university_id },
            update: {},
            create: {
                university_id: userData.university_id,
                password_hash: passwordHash,
                full_name: userData.full_name,
                role_id: userData.role_id,
                email: userData.email || `${userData.university_id}@university.edu.sa`,
                phone: '0500000000',
            },
        })
        seededUsers[userData.university_id] = u
        console.log(`- Created/Verified user: ${u.full_name} (${u.university_id})`)
    }

    // 3. Seed Colleges
    console.log('3. Seeding colleges...')
    const college = await prisma.colleges.upsert({
        where: { name: 'كلية علوم الحاسب والمعلومات' },
        update: {
            dean_id: seededUsers.dean1.user_id,
        },
        create: {
            name: 'كلية علوم الحاسب والمعلومات',
            dean_id: seededUsers.dean1.user_id,
            show_absences: true,
        },
    })
    console.log(`- Created/Verified college: ${college.name}`)

    // 4. Seed Departments
    console.log('4. Seeding departments...')
    const deptCS = await prisma.departments.create({
        data: {
            dept_name: 'قسم علوم الحاسب',
            college_id: college.college_id,
            manager_id: seededUsers.hod1.user_id,
            is_academic: true,
            show_absences: true,
        },
    })
    const deptIT = await prisma.departments.create({
        data: {
            dept_name: 'قسم تقنية المعلومات',
            college_id: college.college_id,
            manager_id: seededUsers.hod1.user_id,
            is_academic: true,
            show_absences: true,
        },
    })
    console.log(`- Created departments: ${deptCS.dept_name}, ${deptIT.dept_name}`)

    // 5. Seed Academic Levels, Terms and Subjects
    console.log('5. Seeding academic levels & subjects...')
    const level1 = await prisma.levels.create({
        data: {
            name: 'المستوى الأول',
            order: 1,
            department_id: deptCS.department_id,
            show_absences: true,
        },
    })
    const level2 = await prisma.levels.create({
        data: {
            name: 'المستوى الثاني',
            order: 2,
            department_id: deptCS.department_id,
            show_absences: true,
        },
    })

    const termLevel1 = await prisma.level_terms.create({
        data: {
            level_id: level1.level_id,
            name: 'الفصل الدراسي الأول',
            order: 1,
        },
    })
    const termLevel2 = await prisma.level_terms.create({
        data: {
            level_id: level2.level_id,
            name: 'الفصل الدراسي الثاني',
            order: 2,
        },
    })

    const subject1 = await prisma.subjects.create({
        data: {
            term_id: termLevel1.term_id,
            name: 'مبادئ البرمجة',
            code: 'CS101',
        },
    })
    const subject2 = await prisma.subjects.create({
        data: {
            term_id: termLevel2.term_id,
            name: 'قواعد البيانات',
            code: 'CS202',
        },
    })
    const subject3 = await prisma.subjects.create({
        data: {
            term_id: termLevel2.term_id,
            name: 'تصميم الويب',
            code: 'CS204',
        },
    })
    console.log(`- Created academic levels, level-terms and subjects.`)

    // 6. Update Users with department_id, level_id and term_id
    console.log('6. Updating users with departments and academic levels...')
    await prisma.users.update({
        where: { user_id: seededUsers.dean1.user_id },
        data: { department_id: deptCS.department_id },
    })
    await prisma.users.update({
        where: { user_id: seededUsers.hod1.user_id },
        data: { department_id: deptCS.department_id },
    })
    await prisma.users.update({
        where: { user_id: seededUsers.emp1.user_id },
        data: { department_id: deptCS.department_id },
    })

    // Students
    await prisma.users.update({
        where: { user_id: seededUsers.student1.user_id },
        data: {
            department_id: deptCS.department_id,
            level_id: level1.level_id,
            current_term_id: termLevel1.term_id,
            academic_year: '2025-2026',
        },
    })
    await prisma.users.update({
        where: { user_id: seededUsers.student2.user_id },
        data: {
            department_id: deptCS.department_id,
            level_id: level2.level_id,
            current_term_id: termLevel2.term_id,
            academic_year: '2025-2026',
        },
    })
    await prisma.users.update({
        where: { user_id: seededUsers.student3.user_id },
        data: {
            department_id: deptIT.department_id,
            level_id: level1.level_id,
            current_term_id: termLevel1.term_id,
            academic_year: '2025-2026',
        },
    })
    console.log('- Users updated successfully.')

    // 7. Seed General Terms (Semesters)
    console.log('7. Seeding general terms...')
    const currentSemester = await prisma.terms.create({
        data: {
            name: 'الفصل الدراسي الثاني 2026',
            start_date: new Date('2026-02-01'),
            end_date: new Date('2026-06-30'),
        },
    })
    console.log(`- Created general term: ${currentSemester.name}`)

    // 8. Seed Workflows and Workflow Steps
    console.log('8. Seeding workflows...')
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
            name: 'اعتماد رئيس القسم',
            approver_role_id: roles.head_of_department.role_id,
            sla_hours: 48,
            is_final: false,
        },
    })
    const excuseStep3 = await prisma.workflow_steps.create({
        data: {
            workflow_id: workflowExcuse.workflow_id,
            order: 3,
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

    // 9. Seed Request Types and Form Templates
    console.log('9. Seeding Request Types and Form Templates...')
    
    // Request Type 1
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
            id: '3',
            label: 'المادة التي تغيبت عنها',
            key: 'subject_name',
            type: 'select',
            required: true,
            options: [
                { id: '1', label: 'مبادئ البرمجة (CS101)' },
                { id: '2', label: 'قواعد البيانات (CS202)' },
                { id: '3', label: 'تصميم الويب (CS204)' }
            ]
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

    // Request Type 2
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
                { id: '1', label: 'الفصل الدراسي الثاني 2026' }
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

    // 10. Seed Requests and Request Actions (Audit Trail)
    console.log('10. Seeding student requests...')

    // Fetch form templates
    const formExcuse = await prisma.form_templates.findFirst({ where: { name: 'نموذج طلب عذر غياب رسمي' } })
    const formPostpone = await prisma.form_templates.findFirst({ where: { name: 'نموذج طلب تأجيل دراسي' } })

    if (formExcuse && formPostpone) {
        // Request 1: Pending Request (at Step 1)
        const req1 = await prisma.requests.create({
            data: {
                reference_no: 'REQ-2026-0001',
                requester_id: seededUsers.student1.user_id,
                form_id: formExcuse.form_id,
                current_step_id: excuseStep1.step_id,
                term_id: currentSemester.term_id,
                status: 'pending',
                submission_data: {
                    excuse_reason: 'أصبت بوعكة صحية طارئة منعتني من حضور اختبار المحاضرة ودخلت على إثرها المستشفى الجامعي.',
                    excuse_date: '2026-05-15',
                    subject_name: 'مبادئ البرمجة (CS101)',
                    medical_report: 'medical_report_student1.pdf'
                },
                submitted_at: new Date('2026-05-16T09:00:00Z'),
            }
        })

        // Request 2: Approved Request (Fully Completed)
        const req2 = await prisma.requests.create({
            data: {
                reference_no: 'REQ-2026-0002',
                requester_id: seededUsers.student2.user_id,
                form_id: formExcuse.form_id,
                current_step_id: excuseStep3.step_id,
                term_id: currentSemester.term_id,
                status: 'approved',
                submission_data: {
                    excuse_reason: 'المشاركة في مسابقة البرمجة الوطنية ممثلاً عن جامعة العرب.',
                    excuse_date: '2026-05-10',
                    subject_name: 'قواعد البيانات (CS202)',
                    medical_report: 'participation_certificate.pdf'
                },
                submitted_at: new Date('2026-05-11T08:30:00Z'),
            }
        })

        // Audit Trail / Approvals for Request 2
        await prisma.request_actions.create({
            data: {
                request_id: req2.request_id,
                actor_id: seededUsers.emp1.user_id,
                step_id: excuseStep1.step_id,
                action: 'approved',
                comment: 'تم التحقق من خطاب المشاركة الرسمي، التقرير معتمد.',
                created_at: new Date('2026-05-11T14:22:00Z'),
            }
        })
        await prisma.request_actions.create({
            data: {
                request_id: req2.request_id,
                actor_id: seededUsers.hod1.user_id,
                step_id: excuseStep2.step_id,
                action: 'approved',
                comment: 'نوصي بالموافقة ودعم الطالب للمشاركة المتميزة باسم الكلية.',
                created_at: new Date('2026-05-12T10:15:00Z'),
            }
        })
        await prisma.request_actions.create({
            data: {
                request_id: req2.request_id,
                actor_id: seededUsers.dean1.user_id,
                step_id: excuseStep3.step_id,
                action: 'approved',
                comment: 'يعتمد العذر الطبي ويسمح للطالب بإجراء الاختبار البديل.',
                created_at: new Date('2026-05-12T15:40:00Z'),
            }
        })

        // Request 3: Rejected Request
        const req3 = await prisma.requests.create({
            data: {
                reference_no: 'REQ-2026-0003',
                requester_id: seededUsers.student3.user_id,
                form_id: formPostpone.form_id,
                current_step_id: postponeStep1.step_id,
                term_id: currentSemester.term_id,
                status: 'rejected',
                submission_data: {
                    postpone_term: 'الفصل الدراسي الثاني 2026',
                    postpone_reason: 'بسبب الرغبة في السفر للسياحة العائلية المؤقتة.'
                },
                submitted_at: new Date('2026-05-13T11:00:00Z'),
            }
        })

        // Reject action
        await prisma.request_actions.create({
            data: {
                request_id: req3.request_id,
                actor_id: seededUsers.emp1.user_id,
                step_id: postponeStep1.step_id,
                action: 'rejected',
                comment: 'السفر بغرض السياحة لا يمثل ظرفاً قهرياً يسمح بتأجيل الفصل الدراسي بحسب لوائح شؤون الطلاب.',
                created_at: new Date('2026-05-14T09:30:00Z'),
            }
        })

        console.log('- Seed requests and actions created successfully.')
    }

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
