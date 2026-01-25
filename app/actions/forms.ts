"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

/**
 * Get all form templates with metadata
 */
export async function getAllFormTemplates(page: number = 1, limit: number = 20) {
    try {
        const skip = (page - 1) * limit

        const [templates, total] = await Promise.all([
            db.form_templates.findMany({
                include: {
                    request_types: {
                        include: {
                            workflows: true
                        }
                    }
                },
                orderBy: { created_at: 'desc' },
                skip: skip,
                take: limit
            }),
            db.form_templates.count()
        ])

        return {
            success: true,
            data: templates.map(t => ({
                ...t,
                created_at: t.created_at?.toISOString() || null,
                updated_at: (t as any).updated_at?.toISOString() || null
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        }
    } catch (error) {
        console.error("Get Form Templates Error:", error)
        return { success: false, error: "فشل في تحميل النماذج" }
    }
}

/**
 * Get single form template with full schema
 */
export async function getFormTemplate(formId: number) {
    try {
        const template = await db.form_templates.findUnique({
            where: { form_id: formId },
            include: {
                request_types: {
                    include: {
                        workflows: {
                            include: {
                                workflow_steps: {
                                    include: {
                                        roles: true
                                    },
                                    orderBy: { order: 'asc' }
                                }
                            }
                        }
                    }
                }
            }
        })

        if (!template) {
            return { success: false, error: "النموذج غير موجود" }
        }

        return {
            success: true,
            data: template
        }
    } catch (error) {
        console.error("Get Form Template Error:", error)
        return { success: false, error: "فشل في تحميل النموذج" }
    }
}

/**
 * Save form template (draft)
 */
export async function saveFormTemplate(data: {
    form_id?: number
    name: string
    schema: any
    request_type_id?: number | null
    audience_config?: any
}) {
    try {
        if (data.form_id) {
            // Update existing
            const updated = await db.form_templates.update({
                where: { form_id: data.form_id },
                data: {
                    name: data.name,
                    schema: data.schema,
                    audience_config: data.audience_config,
                    request_type_id: data.request_type_id
                }
            })

            // revalidatePath('/admin')
            return { success: true, data: updated }
        } else {
            // Create new
            const created = await db.form_templates.create({
                data: {
                    name: data.name,
                    schema: data.schema,
                    is_active: false, // Draft
                    audience_config: data.audience_config,
                    request_type_id: data.request_type_id
                }
            })

            // revalidatePath('/admin')
            return { success: true, data: created }
        }
    } catch (error) {
        console.error("Save Form Template Error:", error)
        return { success: false, error: "فشل في حفظ النموذج" }
    }
}

/**
 * Publish form template to specified audience with workflow assignment
 */
export async function publishFormTemplate(
    formId: number,
    audienceConfig: {
        student?: boolean
        employee?: boolean
        colleges?: number[]
        departments?: number[]
    },
    workflowOptions?: {
        mode: 'existing' | 'new' | 'none'
        workflowId?: number  // For existing workflow
        newWorkflow?: {      // For new workflow
            name: string
            steps: Array<{
                name: string
                order: number
                approver_role_id?: number
                approver_user_id?: number | null
                sla_hours?: number
                is_final?: boolean
                escalation_role_id?: number | null
            }>
        }
    }
) {
    try {
        await db.$transaction(async (tx) => {
            // First, get or create request_type
            const form = await tx.form_templates.findUnique({
                where: { form_id: formId },
                include: { request_types: true }
            })

            if (!form) {
                throw new Error("النموذج غير موجود")
            }

            let requestTypeId = form.request_type_id

            // Create request_type if it doesn't exist
            if (!requestTypeId) {
                const requestType = await tx.request_types.create({
                    data: {
                        key: `form_${formId}_${Date.now()}`,
                        label: form.name
                    }
                })
                requestTypeId = requestType.type_id
            }

            // Handle workflow based on mode - ONLY if options provided or if we need to explicitly set/clear it
            if (workflowOptions) {
                let workflowId: number | null = null

                if (workflowOptions.mode === 'existing' && workflowOptions.workflowId) {
                    // Use existing workflow
                    workflowId = workflowOptions.workflowId
                } else if (workflowOptions.mode === 'new' && workflowOptions.newWorkflow) {
                    // Create new workflow
                    const workflow = await tx.workflows.create({
                        data: {
                            name: workflowOptions.newWorkflow.name,
                            is_active: true,
                            workflow_steps: {
                                create: workflowOptions.newWorkflow.steps.map(step => ({
                                    name: step.name,
                                    order: step.order,
                                    approver_role_id: step.approver_role_id || null,
                                    approver_user_id: step.approver_user_id || null,
                                    sla_hours: step.sla_hours || null,
                                    is_final: step.is_final || false,
                                    escalation_role_id: step.escalation_role_id || null
                                }))
                            }
                        }
                    })
                    workflowId = workflow.workflow_id
                }
                // mode === 'none': workflowId stays null

                // Update request_type with workflow
                await tx.request_types.update({
                    where: { type_id: requestTypeId },
                    data: {
                        workflow_id: workflowId
                    }
                })
            }

            // Update form template
            await tx.form_templates.update({
                where: { form_id: formId },
                data: {
                    is_active: true,
                    audience_config: audienceConfig,
                    request_type_id: requestTypeId
                }
            })
        })

        // revalidatePath('/admin')
        return { success: true }
    } catch (error) {
        console.error("Publish Form Template Error:", error)
        return { success: false, error: "فشل في نشر النموذج" }
    }
}

/**
 * Toggle form active status
 */
export async function toggleFormStatus(formId: number, isActive: boolean) {
    try {
        const updated = await db.form_templates.update({
            where: { form_id: formId },
            data: { is_active: isActive }
        })

        // revalidatePath('/admin')
        return { success: true, data: updated }
    } catch (error) {
        console.error("Toggle Form Status Error:", error)
        return { success: false, error: "فشل في تحديث حالة النموذج" }
    }
}

/**
 * Delete form template
 * If the form has no requests, it will be hard deleted.
 * If it has requests, it will return an error (or soft delete if preferred, but user wants deletion).
 */
export async function deleteFormTemplate(formId: number) {
    try {
        // Check if there are any requests associated with this form
        const requestsCount = await db.requests.count({
            where: { form_id: formId }
        })

        if (requestsCount > 0) {
            // Cannot hard delete, so just deactivate (soft delete) and inform user
            await db.form_templates.update({
                where: { form_id: formId },
                data: { is_active: false }
            })

            // revalidatePath('/admin')
            return {
                success: true,
                message: "تم تعطيل النموذج لوجود طلبات مرتبطة به"
            }
        }

        // Hard delete
        await db.form_templates.delete({
            where: { form_id: formId }
        })

        // revalidatePath('/admin')
        return { success: true, message: "تم حذف النموذج نهائياً" }
    } catch (error) {
        console.error("Delete Form Template Error:", error)
        return { success: false, error: "فشل في حذف النموذج" }
    }
}

/**
 * Get form schema for dynamic rendering
 */
export async function getDynamicFormSchema(formId: number) {
    try {
        const template = await db.form_templates.findUnique({
            where: { form_id: formId },
            select: {
                form_id: true,
                name: true,
                schema: true
            }
        })

        if (!template || !template.schema) {
            return { success: false, error: "مخطط النموذج غير موجود" }
        }

        return {
            success: true,
            data: template
        }
    } catch (error) {
        console.error("Get Form Schema Error:", error)
        return { success: false, error: "فشل في تحميل مخطط النموذج" }
    }
}

/**
 * Get available form templates for a specific user based on role and department
 */
export async function getAvailableFormTemplates(userId: string) {
    try {
        const user = await db.users.findUnique({
            where: { university_id: userId },
            include: {
                roles: true,
                departments_users_department_idTodepartments: {
                    include: {
                        colleges: true
                    }
                }
            }
        })

        if (!user) {
            return { success: false, error: "المستخدم غير موجود" }
        }

        // Get all active templates
        const allTemplates = await db.form_templates.findMany({
            where: { is_active: true },
            include: {
                request_types: true
            }
        })

        // Filter based on audience config
        const availableTemplates = allTemplates.filter(template => {
            if (!template.audience_config) return true // No restrictions

            const config = template.audience_config as any

            // Check role
            // Check role - use relaxed matching (case-insensitive includes)
            const roleName = user.roles.role_name.toLowerCase()
            const isStudentRole = roleName.includes('student') || roleName === 'student'
            const isEmployeeRole = roleName.includes('employee') || roleName === 'staff' || roleName === 'faculty'

            if (isStudentRole && config.student === false) return false
            if (isEmployeeRole && config.employee === false) return false

            // Check college
            if (config.colleges && config.colleges.length > 0) {
                const userCollegeId = user.departments_users_department_idTodepartments?.colleges?.college_id
                if (!userCollegeId || !config.colleges.includes(userCollegeId)) return false
            }

            // Check department
            if (config.departments && config.departments.length > 0) {
                if (!user.department_id || !config.departments.includes(user.department_id)) return false
            }

            return true
        })

        return {
            success: true,
            data: availableTemplates
        }
    } catch (error) {
        console.error("Get Available Templates Error:", error)
        return { success: false, error: "فشل في تحميل النماذج المتاحة" }
    }
}
