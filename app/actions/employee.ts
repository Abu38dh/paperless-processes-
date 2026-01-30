"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { notifyRequestStatusChange, notifyApproverNewRequest, notifyUserApproverNewRequest } from "./notifications"
import { Prisma } from "@prisma/client"
import fs from 'fs'
import path from 'path'

export async function getEmployeeInbox(employeeId: string) {
    try {
        const user = await db.users.findUnique({
            where: { university_id: employeeId },
            include: {
                roles: true
            }
        })

        if (!user) throw new Error("Employee not found")

        // Find requests where:
        // 1. Status is pending
        // 2. AND (Approver Role matches User Role OR Approver User matches User ID)
        const pendingRequests = await db.requests.findMany({
            where: {
                status: "pending",
                OR: [
                    {
                        workflow_steps: {
                            approver_role_id: user.role_id
                        }
                    },
                    {
                        workflow_steps: {
                            approver_user_id: user.user_id
                        }
                    }
                ] as any
            },
            include: {
                users: true, // requester
                form_templates: true,
                workflow_steps: true
            },
            orderBy: { submitted_at: 'asc' }
        })

        return {
            success: true,
            requests: pendingRequests.map((r: any) => ({
                id: r.request_id.toString(),
                applicant: r.users.full_name,
                type: r.form_templates?.name || "General",
                date: r.submitted_at?.toISOString().split('T')[0] || "",
                status: "pending",
                priority: "normal",
                description: (r.submission_data as any)?.reason || "",
                submissionData: r.submission_data,
                formSchema: r.form_templates?.schema
            }))
        }
    } catch (error) {
        console.error("Employee Inbox Error:", error)
        return { success: false, error: "Failed to fetch inbox" }
    }
}

export async function getEmployeeRequests(employeeId: string) {
    try {
        const user = await db.users.findUnique({
            where: { university_id: employeeId },
        })

        if (!user) throw new Error("Employee not found")

        const requests = await db.requests.findMany({
            where: { requester_id: user.user_id },
            include: {
                form_templates: {
                    include: {
                        request_types: {
                            include: {
                                workflows: {
                                    include: {
                                        workflow_steps: {
                                            include: { roles: true, users: true },
                                            orderBy: { order: 'asc' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                workflow_steps: true,
                users: true, // requester info
                attachments: {
                    include: { users: true }
                }
            },
            orderBy: { submitted_at: 'desc' }
        })

        return {
            success: true,
            requests: requests.map((r: any) => ({
                id: r.request_id.toString(),
                title: r.form_templates?.name || "General",
                type: r.form_templates?.name || "General",
                formId: r.form_templates?.form_id?.toString() || r.form_id?.toString(),
                date: r.submitted_at?.toISOString().split('T')[0] || "",
                status: r.status,
                description: (r.submission_data as any)?.reason || "لا يوجد وصف",
                submissionData: r.submission_data,
                reference_no: r.reference_no,
                // Include raw data for client mapping if needed, or map workflow here
                // Mapping workflow here to be safe and consistent
                workflow: (() => {
                    const steps = r.form_templates?.request_types?.workflows?.workflow_steps || [];
                    const currentStepId = r.current_step_id;
                    const requestStatus = r.status;
                    const currentStepIndex = steps.findIndex((s: any) => s.step_id === currentStepId);

                    return steps.map((step: any, index: number) => {
                        let status = "pending";
                        if (requestStatus === "approved") {
                            status = "approved";
                        } else if (requestStatus === "rejected") {
                            if (index < currentStepIndex) status = "approved";
                            else if (index === currentStepIndex) status = "rejected";
                            else status = "pending";
                        } else if (requestStatus === "returned") {
                            if (index < currentStepIndex) status = "approved";
                            else if (index === currentStepIndex) status = "returned";
                            else status = "pending";
                        } else {
                            if (index < currentStepIndex) status = "approved";
                            else if (index === currentStepIndex) status = "processing";
                            else status = "pending";

                            // Fallback for new requests
                            if (currentStepIndex === -1 && index === 0 && requestStatus !== 'approved' && requestStatus !== 'rejected' && requestStatus !== 'returned') {
                                status = "processing";
                            }
                        }

                        return {
                            step: index + 1,
                            department: step.name || `خطوة ${index + 1}`,
                            role: step.users?.full_name || step.roles?.role_name || "موافق",
                            status: status
                        };
                    });
                })(),
                attachments: r.attachments?.map((a: any) => ({
                    file_id: a.file_id,
                    storage_location: a.storage_location,
                    uploaded_at: a.uploaded_at,
                    uploader_name: a.users?.full_name
                })) || []
            }))
        }
    } catch (error) {
        console.error("Employee Requests Error:", error)
        return { success: false, error: "Failed to fetch requests" }
    }
}

export async function getEmployeeHistory(employeeId: string) {
    try {
        const user = await db.users.findUnique({
            where: { university_id: employeeId },
        })

        if (!user) throw new Error("Employee not found")

        const actions = await db.request_actions.findMany({
            where: { actor_id: user.user_id },
            include: {
                requests: {
                    include: {
                        users: true,
                        form_templates: true
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        })

        return {
            success: true,
            history: actions.map((a: any) => ({
                id: a.action_id.toString(),
                requestId: a.request_id?.toString(),
                requestType: a.requests?.form_templates?.name || "General",
                applicant: a.requests?.users?.full_name,
                action: a.action,
                date: a.created_at?.toISOString().split('T')[0],
                timestamp: a.created_at,
                comment: a.comment,
                status: a.requests?.status // Current status of the request
            }))
        }
    } catch (error) {
        console.error("Employee History Error:", error)
        return { success: false, error: "Failed to fetch history" }
    }
}


export async function processRequest(requestId: string, action: 'approve' | 'reject' | 'approve_with_changes' | 'reject_with_changes', comment: string, actorId: string, attachmentData?: string, attachmentName?: string) {
    try {
        const user = await db.users.findUnique({
            where: { university_id: actorId },
            include: { roles: true }
        })
        if (!user) return { success: false, error: "المستخدم غير موجود" }

        const request = await db.requests.findUnique({
            where: { request_id: parseInt(requestId) },
            include: {
                form_templates: true,
                users: true,
                workflow_steps: {
                    include: {
                        workflows: {
                            include: {
                                workflow_steps: {
                                    orderBy: { order: 'asc' }
                                }
                            }
                        }
                    }
                }
            }
        })
        if (!request) return { success: false, error: "الطلب غير موجود" }

        // Authorization check: Verify user is authorized to process this step
        const currentStep = request.workflow_steps
        if (currentStep) {
            const isAuthorized =
                currentStep.approver_role_id === user.role_id ||
                currentStep.approver_user_id === user.user_id

            if (!isAuthorized) {
                return { success: false, error: "غير مصرح لك بمعالجة هذا الطلب" }
            }
        }

        // Use transaction for atomicity
        await db.$transaction(async (tx) => {
            // Handle Attachment if present
            let finalComment = comment
            if (attachmentData && attachmentName) {
                try {
                    // Create uploads directory if not exists
                    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
                    if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir, { recursive: true })
                    }

                    // Save file
                    const fileName = `req-${request.request_id}-act-${Date.now()}-${attachmentName}`
                    const filePath = path.join(uploadDir, fileName)

                    // Decode base64 (remove data:application/pdf;base64, prefix if exists)
                    const base64Data = attachmentData.split(';base64,').pop() || ""
                    fs.writeFileSync(filePath, base64Data, { encoding: 'base64' })

                    // Create DB Record
                    await tx.attachments.create({
                        data: {
                            request_id: request.request_id,
                            uploader_id: user.user_id,
                            storage_location: `/uploads/${fileName}`,
                            file_type: attachmentName.split('.').pop() || 'file',
                            uploaded_at: new Date()
                        }
                    })

                    finalComment += `\n\n[تم إرفاق ملف: ${attachmentName}]`
                } catch (err) {
                    console.error("Failed to save attachment:", err)
                    // Continue without attachment but log it
                    finalComment += `\n\n[فشل رفع الملف: ${attachmentName}]`
                }
            }

            // Record the action
            await tx.request_actions.create({
                data: {
                    request_id: request.request_id,
                    actor_id: user.user_id,
                    action: action,
                    comment: finalComment,
                    step_id: request.current_step_id
                }
            })

            if (action === 'reject') {
                await tx.requests.update({
                    where: { request_id: request.request_id },
                    data: { status: 'rejected' }
                })
            } else if (action === 'reject_with_changes') {
                // Return to student, stay on current step
                await tx.requests.update({
                    where: { request_id: request.request_id },
                    data: { status: 'returned' }
                })
            } else {
                // Determine Next Step
                let nextStep: any = null

                if (currentStep?.workflows) {
                    const allSteps = currentStep.workflows.workflow_steps
                    const currentStepIndex = allSteps.findIndex(s => s.step_id === currentStep.step_id)
                    nextStep = allSteps[currentStepIndex + 1]
                }

                if (action === 'approve_with_changes') {
                    // Logic: Advance step (if possible) AND Return to student
                    if (nextStep) {
                        await tx.requests.update({
                            where: { request_id: request.request_id },
                            data: {
                                current_step_id: nextStep.step_id,
                                status: 'returned'
                            }
                        })
                    } else {
                        // Final step - act as return (reject with changes logic)
                        await tx.requests.update({
                            where: { request_id: request.request_id },
                            data: { status: 'returned' }
                        })
                    }
                } else {
                    // Standard Approve
                    if (nextStep) {
                        // Move to next step
                        await tx.requests.update({
                            where: { request_id: request.request_id },
                            data: {
                                current_step_id: nextStep.step_id,
                                status: 'in_progress'
                            }
                        })

                        // Notify next approver
                        if (nextStep.approver_user_id) {
                            await notifyUserApproverNewRequest(
                                nextStep.approver_user_id,
                                request.request_id,
                                request.form_templates?.name || "طلب",
                                user.full_name
                            )
                        } else if (nextStep.approver_role_id) {
                            await notifyApproverNewRequest(
                                nextStep.approver_role_id,
                                request.request_id,
                                request.form_templates?.name || "طلب",
                                user.full_name
                            )
                        }
                    } else {
                        // Final Approval
                        await tx.requests.update({
                            where: { request_id: request.request_id },
                            data: {
                                status: 'approved',
                                current_step_id: null
                            }
                        })
                    }
                }
            }
        })

        // Notify requester (outside transaction)
        let notifyStatus = 'processing';
        if (action === 'reject') notifyStatus = 'rejected';
        else if (action.includes('with_changes')) notifyStatus = 'returned';
        else if (action === 'approve') {
            // Basic check for final approval
            if (!currentStep?.workflows || !currentStep.workflows.workflow_steps[currentStep.workflows.workflow_steps.findIndex(s => s.step_id === currentStep.step_id) + 1]) {
                notifyStatus = 'approved';
            } else {
                notifyStatus = 'in_progress';
            }
        }

        await notifyRequestStatusChange(
            request.request_id,
            notifyStatus,
            user.full_name
        )

        // revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error("Process Request Error:", error)
        return { success: false, error: "فشل تنفيذ الإجراء" }
    }
}

/**
 * Get employee statistics
 */
export async function getEmployeeStats(userId: string) {
    try {
        const user = await db.users.findUnique({
            where: { university_id: userId },
            include: { roles: true }
        })

        if (!user) return { success: false, error: "المستخدم غير موجود" }

        // Count actions by this employee
        const totalActionsCount = await db.request_actions.count({
            where: { actor_id: user.user_id }
        })

        const approvedCount = await db.request_actions.count({
            where: {
                actor_id: user.user_id,
                action: 'approve'
            }
        })

        const rejectedCount = await db.request_actions.count({
            where: {
                actor_id: user.user_id,
                action: 'reject'
            }
        })

        // Pending in inbox
        const pendingCount = await db.requests.count({
            where: {
                status: "pending",
                OR: [
                    {
                        workflow_steps: {
                            approver_role_id: user.role_id
                        }
                    },
                    {
                        workflow_steps: {
                            approver_user_id: user.user_id
                        }
                    }
                ] as any
            }
        })

        return {
            success: true,
            data: {
                totalActions: totalActionsCount,
                approved: approvedCount,
                rejected: rejectedCount,
                pending: pendingCount
            }
        }
    } catch (error) {
        console.error("Get Employee Stats Error:", error)
        return { success: false, error: "فشل في تحميل الإحصائيات" }
    }
}

/**
 * Get active delegations for a user
 */
export async function getDelegations(userId: string) {
    try {
        const user = await db.users.findUnique({
            where: { university_id: userId }
        })

        if (!user) return { success: false, error: "المستخدم غير موجود" }

        const delegations = await db.delegations.findMany({
            where: {
                OR: [
                    { grantor_user_id: user.user_id },
                    { grantee_user_id: user.user_id }
                ],
                is_active: true
            },
            include: {
                users_delegations_grantor_user_idTousers: true,
                users_delegations_grantee_user_idTousers: true
            }
        })

        return {
            success: true,
            data: delegations
        }
    } catch (error) {
        console.error("Get Delegations Error:", error)
        return { success: false, error: "فشل في تحميل التفويضات" }
    }
}

/**
 * Create a delegation
 */
export async function createDelegation(data: {
    grantorId: string
    granteeId: string
    startDate: Date
    endDate: Date
}) {
    try {
        const grantor = await db.users.findUnique({
            where: { university_id: data.grantorId }
        })

        const grantee = await db.users.findUnique({
            where: { university_id: data.granteeId }
        })

        if (!grantor || !grantee) {
            return { success: false, error: "المستخدم غير موجود" }
        }

        const delegation = await db.delegations.create({
            data: {
                grantor_user_id: grantor.user_id,
                grantee_user_id: grantee.user_id,
                starts_at: data.startDate,
                ends_at: data.endDate,
                is_active: true
            }
        })

        // revalidatePath('/')
        return { success: true, data: delegation }
    } catch (error) {
        console.error("Create Delegation Error:", error)
        return { success: false, error: "فشل في إنشاء التفويض" }
    }
}

/**
 * Update a delegation
 */
export async function updateDelegation(
    delegationId: number,
    data: {
        startDate?: Date
        endDate?: Date
        isActive?: boolean
    }
) {
    try {
        // Validate dates if provided
        if (data.startDate && data.endDate && data.endDate <= data.startDate) {
            return { success: false, error: "تاريخ النهاية يجب أن يكون بعد تاريخ البداية" }
        }

        const updateData: any = {}
        if (data.startDate !== undefined) updateData.starts_at = data.startDate
        if (data.endDate !== undefined) updateData.ends_at = data.endDate
        if (data.isActive !== undefined) updateData.is_active = data.isActive

        const delegation = await db.delegations.update({
            where: { delegation_id: delegationId },
            data: updateData
        })

        // revalidatePath('/')
        return { success: true, data: delegation }
    } catch (error) {
        console.error("Update Delegation Error:", error)
        return { success: false, error: "فشل في تحديث التفويض" }
    }
}

/**
 * Delete (deactivate) a delegation
 */
export async function deleteDelegation(delegationId: number) {
    try {
        await db.delegations.update({
            where: { delegation_id: delegationId },
            data: { is_active: false }
        })

        // revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error("Delete Delegation Error:", error)
        return { success: false, error: "فشل في حذف التفويض" }
    }
}

/**
 * Toggle delegation active status
 */
export async function toggleDelegation(delegationId: number, isActive: boolean) {
    try {
        const delegation = await db.delegations.update({
            where: { delegation_id: delegationId },
            data: { is_active: isActive }
        })

        // revalidatePath('/')
        return { success: true, data: delegation }
    } catch (error) {
        console.error("Toggle Delegation Error:", error)
        return { success: false, error: "فشل في تحديث حالة التفويض" }
    }
}

