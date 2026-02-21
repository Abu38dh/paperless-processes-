"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

/**
 * Get all workflows with their steps
 */
export async function getAllWorkflows() {
    try {
        const workflows = await db.workflows.findMany({
            include: {
                workflow_steps: {
                    include: {
                        roles: true
                    },
                    orderBy: { order: 'asc' }
                },
                request_types: true
            },
            orderBy: { workflow_id: 'asc' }
        })

        return {
            success: true,
            data: workflows
        }
    } catch (error) {
        console.error("Get Workflows Error:", error)
        return { success: false, error: "فشل في تحميل مسارات العمل" }
    }
}

/**
 * Get single workflow with details
 */
export async function getWorkflow(workflowId: number) {
    try {
        const workflow = await db.workflows.findUnique({
            where: { workflow_id: workflowId },
            include: {
                workflow_steps: {
                    include: {
                        roles: true,
                        users: true
                    },
                    orderBy: { order: 'asc' }
                },
                request_types: true
            }
        })

        if (!workflow) {
            return { success: false, error: "مسار العمل غير موجود" }
        }

        return {
            success: true,
            data: workflow
        }
    } catch (error) {
        console.error("Get Workflow Error:", error)
        return { success: false, error: "فشل في تحميل مسار العمل" }
    }
}

import { logAuditAction } from "./audit"
// ... (existing imports)

// ... (keep getAllWorkflows, getWorkflow)

/**
 * Create new workflow with steps
 */
export async function createWorkflow(data: {
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
    requesterId?: string
}) {
    try {
        // Enforce Scoping (Keep existing logic)
        if (data.requesterId) {
             const requester = await db.users.findUnique({
                where: { university_id: data.requesterId },
                include: {
                    roles: true,
                    departments_users_department_idTodepartments: {
                        include: { colleges: true }
                    }
                }
            })

            if (requester) {
                const roleName = requester.roles.role_name.toLowerCase()

                // Validate steps
                for (const step of data.steps) {
                    if (step.approver_user_id) {
                        const approver = await db.users.findUnique({
                            where: { user_id: step.approver_user_id },
                            include: { departments_users_department_idTodepartments: { include: { colleges: true } } }
                        })

                        if (approver) {
                            if (roleName === 'dean') {
                                // Dean can only pick users in their college
                                const reqCollege = requester.departments_users_department_idTodepartments?.colleges?.college_id
                                const appCollege = approver.departments_users_department_idTodepartments?.colleges?.college_id
                                if (reqCollege && reqCollege !== appCollege) {
                                    throw new Error(`لا يمكنك إضافة موظف من خارج كليتك لهذا المسار (${approver.full_name})`)
                                }
                            } else if ((roleName === 'manager' || roleName === 'head') && requester.department_id !== approver.department_id) {
                                // Head can only pick users in their department
                                throw new Error(`لا يمكنك إضافة موظف من خارج قسمك لهذا المسار (${approver.full_name})`)
                            }
                        }
                    }
                }
            }
        }

        const workflow = await db.workflows.create({
            data: {
                name: data.name,
                is_active: true,
                workflow_steps: {
                    create: data.steps.map(step => ({
                        name: step.name,
                        order: step.order,
                        approver_role_id: step.approver_role_id || null,
                        approver_user_id: step.approver_user_id || null,
                        sla_hours: step.sla_hours || null,
                        is_final: step.is_final || false,
                        escalation_role_id: step.escalation_role_id || null
                    }))
                }
            },
            include: {
                workflow_steps: true
            }
        })

        if (data.requesterId) {
            const executor = await db.users.findUnique({ where: { university_id: data.requesterId } })
            await logAuditAction(executor?.user_id, 'CREATE', 'WORKFLOW', workflow.name, { new_id: workflow.workflow_id })
        }

        // revalidatePath('/admin')
        return { success: true, data: workflow }
    } catch (error: any) {
        console.error("Create Workflow Error:", error)
        return { success: false, error: error.message || "فشل في إنشاء مسار العمل" }
    }
}

/**
 * Update workflow
 */
export async function updateWorkflow(
    workflowId: number,
    data: {
        name?: string
        is_active?: boolean
        steps?: Array<{
            step_id?: number
            name: string
            order: number
            approver_role_id?: number
            approver_user_id?: number | null
            sla_hours?: number
            is_final?: boolean
            escalation_role_id?: number | null
        }>
        requesterId?: string
    }
) {
    try {
        // Enforce Scoping (Keep existing logic)
        if (data.requesterId && data.steps) {
             const requester = await db.users.findUnique({
                where: { university_id: data.requesterId },
                include: {
                    roles: true,
                    departments_users_department_idTodepartments: {
                        include: { colleges: true }
                    }
                }
            })

            if (requester) {
                const roleName = requester.roles.role_name.toLowerCase()

                // Validate steps
                for (const step of data.steps) {
                    if (step.approver_user_id) {
                        const approver = await db.users.findUnique({
                            where: { user_id: step.approver_user_id },
                            include: { departments_users_department_idTodepartments: { include: { colleges: true } } }
                        })

                        if (approver) {
                            if (roleName === 'dean') {
                                // Dean can only pick users in their college
                                const reqCollege = requester.departments_users_department_idTodepartments?.colleges?.college_id
                                const appCollege = approver.departments_users_department_idTodepartments?.colleges?.college_id
                                if (reqCollege && reqCollege !== appCollege) {
                                    throw new Error(`لا يمكنك إضافة موظف من خارج كليتك لهذا المسار (${approver.full_name})`)
                                }
                            } else if ((roleName === 'manager' || roleName === 'head') && requester.department_id !== approver.department_id) {
                                // Head can only pick users in their department
                                throw new Error(`لا يمكنك إضافة موظف من خارج قسمك لهذا المسار (${approver.full_name})`)
                            }
                        }
                    }
                }
            }
        }

        // Update workflow basic info
        const updateData: any = {}
        if (data.name !== undefined) updateData.name = data.name
        if (data.is_active !== undefined) updateData.is_active = data.is_active

        const currentWorkflow = await db.workflows.findUnique({ where: { workflow_id: workflowId } })

        await db.workflows.update({
            where: { workflow_id: workflowId },
            data: updateData
        })

        // Update steps if provided
        if (data.steps) {
            // Delete existing steps
            await db.workflow_steps.deleteMany({
                where: { workflow_id: workflowId }
            })

            // Create new steps
            await db.workflow_steps.createMany({
                data: data.steps.map(step => ({
                    workflow_id: workflowId,
                    name: step.name,
                    order: step.order,
                    approver_role_id: step.approver_role_id || null,
                    approver_user_id: step.approver_user_id || null,
                    sla_hours: step.sla_hours || null,
                    is_final: step.is_final || false,
                    escalation_role_id: step.escalation_role_id || null
                }))
            })
        }

        if (data.requesterId) {
            const executor = await db.users.findUnique({ where: { university_id: data.requesterId } })
            await logAuditAction(executor?.user_id, 'UPDATE', 'WORKFLOW', currentWorkflow?.name || workflowId.toString(), {
                 updated_fields: Object.keys(updateData),
                 steps_updated: !!data.steps
            })
        }

        // revalidatePath('/admin')
        return { success: true }
    } catch (error: any) {
        console.error("Update Workflow Error:", error)
        return { success: false, error: error.message || "فشل في تحديث مسار العمل" }
    }
}

/**
 * Delete workflow
 */
export async function deleteWorkflow(workflowId: number, requesterId?: string) {
    try {
        // Check if workflow is in use
        const requestTypes = await db.request_types.findMany({
            where: { workflow_id: workflowId }
        })

        if (requestTypes.length > 0) {
            return {
                success: false,
                error: "لا يمكن حذف مسار العمل لأنه مرتبط بأنواع طلبات"
            }
        }

        const workflow = await db.workflows.findUnique({ where: { workflow_id: workflowId } })

        // Delete steps first
        await db.workflow_steps.deleteMany({
            where: { workflow_id: workflowId }
        })

        // Delete workflow
        await db.workflows.delete({
            where: { workflow_id: workflowId }
        })

        if (requesterId) {
            const executor = await db.users.findUnique({ where: { university_id: requesterId } })
            await logAuditAction(executor?.user_id, 'DELETE', 'WORKFLOW', workflow?.name || workflowId.toString(), null)
        }

        // revalidatePath('/admin')
        return { success: true }
    } catch (error) {
        console.error("Delete Workflow Error:", error)
        return { success: false, error: "فشل في حذف مسار العمل" }
    }
}

/**
 * Assign workflow to request type (form type)
 */
export async function assignWorkflowToFormType(
    workflowId: number,
    requestTypeId: number
) {
    try {
        await db.request_types.update({
            where: { type_id: requestTypeId },
            data: { workflow_id: workflowId }
        })

        // revalidatePath('/admin')
        return { success: true }
    } catch (error) {
        console.error("Assign Workflow Error:", error)
        return { success: false, error: "فشل في ربط مسار العمل" }
    }
}

/**
 * Get all request types for workflow assignment
 */
export async function getAllRequestTypes() {
    try {
        const requestTypes = await db.request_types.findMany({
            include: {
                workflows: true,
                form_templates: true
            }
        })

        return {
            success: true,
            data: requestTypes
        }
    } catch (error) {
        console.error("Get Request Types Error:", error)
        return { success: false, error: "فشل في تحميل أنواع الطلبات" }
    }
}

/**
 * Get all roles (from admin.ts, re-exported for convenience)
 */
export async function getAllRoles() {
    try {
        const roles = await db.roles.findMany({
            orderBy: { role_name: 'asc' }
        })

        return {
            success: true,
            data: roles
        }
    } catch (error) {
        console.error("Get Roles Error:", error)
        return { success: false, error: "فشل في تحميل الأدوار" }
    }
}
