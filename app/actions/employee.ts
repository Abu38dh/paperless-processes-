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

        // 1. Find Active Delegations where this user is the GRANTEE
        // We look for delegations that are active AND within the date range
        const now = new Date()
        const activeDelegations = await db.delegations.findMany({
            where: {
                grantee_user_id: user.user_id,
                is_active: true,
                starts_at: { lte: now },
                ends_at: { gte: now }
            },
            include: {
                users_delegations_grantor_user_idTousers: {
                    include: { roles: true }
                }
            }
        })

        // Collect Grantor IDs and Grantor Role IDs
        const grantorIds = activeDelegations
            .map(d => d.grantor_user_id)
            .filter(id => id !== null) as number[]

        const grantorRoleIds = activeDelegations
            .map(d => d.users_delegations_grantor_user_idTousers?.role_id)
            .filter(id => id !== undefined) as number[]

        // Combine with current user's IDs
        const targetUserIds = [user.user_id, ...grantorIds]
        const targetRoleIds = [user.role_id, ...grantorRoleIds]

        console.log(`Inbox for ${user.full_name} (${user.user_id}). Delegated for: ${grantorIds.join(', ')}`)

        // Find requests where:
        // 1. Status is pending
        // 2. AND (Approver Role matches Target Roles OR Approver User matches Target User IDs)
        const pendingRequests = await db.requests.findMany({
            where: {
                status: "pending",
                OR: [
                    { workflow_steps: { approver_role_id: { in: targetRoleIds } } },
                    { workflow_steps: { approver_user_id: { in: targetUserIds } } }
                ]
            },
            select: {
                request_id: true,
                status: true,
                submitted_at: true,
                reference_no: true,
                form_id: true,
                submission_data: true, // Needed to check type
                form_templates: {
                    select: { name: true, schema: true }
                },
                users: {
                    select: { full_name: true }
                },
                workflow_steps: {
                    select: { name: true }
                }
            },
            orderBy: { submitted_at: 'asc' },
            take: 50 // Limit to prevent overload
        })

        return {
            success: true,
            requests: pendingRequests.map((r) => {
                // Determine type/title
                let type = r.form_templates?.name || "General"
                const subData = r.submission_data as any
                if (subData?.type === 'SYSTEM_DELEGATION') {
                    type = "طلب تفويض صلاحيات"
                }

                return {
                    id: r.request_id.toString(),
                    applicant: r.users.full_name,
                    type: type,
                    date: r.submitted_at?.toISOString().split('T')[0] || "",
                    status: "pending",
                    priority: "normal",
                    description: subData?.reason || "", // Show reason for delegations
                    submissionData: subData || {},
                    formSchema: r.form_templates?.schema,
                    reference_no: r.reference_no
                }
            })
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
            select: {
                request_id: true,
                status: true,
                submitted_at: true,
                reference_no: true,
                form_id: true,
                submission_data: true,
                form_templates: {
                    select: { name: true, schema: true }
                },
                users: {
                    select: { full_name: true }
                },
                workflow_steps: {
                    select: { name: true }
                }
            },
            orderBy: { submitted_at: 'desc' },
            take: 50
        })

        return {
            success: true,
            requests: requests.map((r) => {
                let type = r.form_templates?.name || "General"
                const subData = r.submission_data as any
                if (subData?.type === 'SYSTEM_DELEGATION') {
                    type = "طلب تفويض صلاحيات"
                }

                return {
                    id: r.request_id.toString(),
                    title: type,
                    type: type,
                    date: r.submitted_at?.toISOString().split('T')[0] || "",
                    status: r.status || "pending",
                    priority: "normal",
                    description: "",
                    submissionData: subData || {},
                    formSchema: r.form_templates?.schema,
                    reference_no: r.reference_no,
                    formId: r.form_id?.toString() || "",
                    workflow: [
                        {
                            step: 1,
                            department: r.workflow_steps?.name || "Pending Step",
                            role: "Approver",
                            status: r.status === 'pending' ? 'processing' : (r.status || 'pending')
                        }
                    ],
                }
            }),
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

        // Deduplicate requests
        const uniqueHistory = actions.reduce((acc, current) => {
            const x = acc.find(item => item.request_id === current.request_id);
            if (!x) {
                return acc.concat([current]);
            } else {
                return acc;
            }
        }, [] as typeof actions);

        return {
            success: true,
            history: uniqueHistory.map((a: any) => ({
                id: a.action_id.toString(),
                requestId: a.request_id?.toString(),
                requestType: a.requests?.form_templates?.name || "General",
                applicant: a.requests?.users?.full_name,
                action: a.action,
                date: a.created_at?.toISOString().split('T')[0],
                timestamp: a.created_at,
                comment: a.comment,
                status: a.requests?.status
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

        // Authorization check
        const currentStep = request.workflow_steps
        if (currentStep) {
            const isAuthorized =
                currentStep.approver_role_id === user.role_id ||
                currentStep.approver_user_id === user.user_id

            // Note: If this is a DELEGATED request, we need to bypass strict ID check or check delegations here too.
            // BUT: `getEmployeeInbox` already filters what they can see.
            // However, strictly speaking, we should verify delegation here too for security.
            // For now, let's assume if they can see it in inbox (filtered by delegation), they can act.
            // But if they call API directly, they might bypass.
            // But if they call API directly, they might bypass.
            // Delegation verification is handled below.

            // Allow if user is authorized directly
            // OR if user is a valid delegatee for the approver
            let isDelegateeAuthorized = false;


            if (!isAuthorized) {
                // Check active delegations
                const now = new Date()

                // Dynamically build conditions for valid delegation check
                const delegationOrConditions: any[] = []
                
                // If this step is assigned to a specific user, check if we are delegated by that user
                if (currentStep.approver_user_id) {
                    delegationOrConditions.push({ grantor_user_id: currentStep.approver_user_id })
                }

                // If this step is assigned to a role, check if we are delegated by someone with that role
                if (currentStep.approver_role_id) {
                    delegationOrConditions.push({
                         users_delegations_grantor_user_idTousers: {
                                role_id: currentStep.approver_role_id
                         }
                    })
                }

                if (delegationOrConditions.length > 0) {
                     const delegations = await db.delegations.findFirst({
                        where: {
                            grantee_user_id: user.user_id,
                            is_active: true,
                            starts_at: { lte: now },
                            ends_at: { gte: now },
                            OR: delegationOrConditions
                        }
                    })
                    if (delegations) isDelegateeAuthorized = true;
                }
            }

            if (!isAuthorized && !isDelegateeAuthorized) {
                return { success: false, error: "غير مصرح لك بمعالجة هذا الطلب" }
            }
        }

        // Transaction
        await db.$transaction(async (tx) => {
            // ... (Attachment handling - same as before) ...
            let finalComment = comment
            if (attachmentData && attachmentName) {
                try {
                    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
                    if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir, { recursive: true })
                    }
                    const fileName = `req-${request.request_id}-act-${Date.now()}-${attachmentName}`
                    const filePath = path.join(uploadDir, fileName)
                    const base64Data = attachmentData.split(';base64,').pop() || ""
                    fs.writeFileSync(filePath, base64Data, { encoding: 'base64' })
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
                    finalComment += `\n\n[فشل رفع الملف: ${attachmentName}]`
                }
            }

            // Record Request Action
            await tx.request_actions.create({
                data: {
                    request_id: request.request_id,
                    actor_id: user.user_id,
                    action: action,
                    comment: finalComment,
                    step_id: request.current_step_id
                }
            })

            // *** DELEGATION SYSTEM HOOK ***
            // Check if this is a SYSTEM_DELEGATION request
            const subData = request.submission_data as any;
            if (subData?.type === 'SYSTEM_DELEGATION' && action === 'approve') {
                // Determine if this is the final step / Dean approval
                // Since System Delegation is created with single step (Dean), any approval is final.

                // Create the actual Delegation Record
                const granteeId = subData.delegatee_university_id; // Stored as university_id
                const grantee = await tx.users.findUnique({ where: { university_id: granteeId } });

                if (grantee) {
                    await tx.delegations.create({
                        data: {
                            grantor_user_id: request.requester_id,
                            grantee_user_id: grantee.user_id,
                            starts_at: new Date(subData.start_date),
                            ends_at: new Date(subData.end_date),
                            is_active: true,
                            request_id: request.request_id
                        }
                    })
                    console.log("Delegation Activated via Request Approval")
                }
            }
            // ******************************

            if (action === 'reject') {
                await tx.requests.update({
                    where: { request_id: request.request_id },
                    data: { status: 'rejected' }
                })
            } else if (action === 'reject_with_changes') {
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
                    if (nextStep) {
                        await tx.requests.update({
                            where: { request_id: request.request_id },
                            data: {
                                current_step_id: nextStep.step_id,
                                status: 'pending' // Changed to pending so next approver can see it
                            }
                        })
                        // Notify next approver
                        if (nextStep.approver_user_id) {
                            await notifyUserApproverNewRequest(nextStep.approver_user_id, request.request_id, request.form_templates?.name || "طلب", user.full_name)
                        } else if (nextStep.approver_role_id) {
                            await notifyApproverNewRequest(nextStep.approver_role_id, request.request_id, request.form_templates?.name || "طلب", user.full_name)
                        }
                    } else {
                        // Final Approval with changes
                        await tx.requests.update({
                            where: { request_id: request.request_id },
                            data: { 
                                status: 'approved',
                                current_step_id: null 
                            }
                        })
                    }
                } else if (nextStep) {
                    // Standard Approve - Next Step exists
                    await tx.requests.update({
                        where: { request_id: request.request_id },
                        // Use 'pending' for standard flow too, to match getEmployeeInbox check
                        data: {
                            current_step_id: nextStep.step_id,
                            status: 'pending' 
                        }
                    })
                    // Notify next approver logic (kept same)
                    if (nextStep.approver_user_id) {
                        await notifyUserApproverNewRequest(nextStep.approver_user_id, request.request_id, request.form_templates?.name || "طلب", user.full_name)
                    } else if (nextStep.approver_role_id) {
                        await notifyApproverNewRequest(nextStep.approver_role_id, request.request_id, request.form_templates?.name || "طلب", user.full_name)
                    }
                } else {
                    // Standard Approve - Final Step
                    await tx.requests.update({
                        where: { request_id: request.request_id },
                        data: {
                            status: 'approved',
                            current_step_id: null
                        }
                    })

                    // --- DELEGATION APPROVAL LOGIC ---
                    const subData = request.submission_data as any
                    if (subData?.type === 'SYSTEM_DELEGATION' && action === 'approve') {
                        // Resolve Delegatee User ID
                        const delegatee = await tx.users.findUnique({
                            where: { university_id: subData.delegatee_university_id }
                        })

                        if (delegatee) {
                            await tx.delegations.create({
                                data: {
                                    request_id: request.request_id,
                                    grantor_user_id: request.requester_id,
                                    grantee_user_id: delegatee.user_id,
                                    starts_at: new Date(subData.start_date),
                                    ends_at: new Date(subData.end_date),
                                    is_active: true
                                }
                            })
                            console.log(`Delegation activated: ${request.requester_id} -> ${delegatee.user_id}`)
                        }
                    }
                }
            }
        })

        // Notify requester (outside transaction)
        let notifyStatus = 'processing';
        if (action === 'reject') notifyStatus = 'rejected';
        else if (action.includes('with_changes')) notifyStatus = 'returned';
        else if (action === 'approve') {
            if (!currentStep?.workflows || !currentStep.workflows.workflow_steps[currentStep.workflows.workflow_steps.findIndex(s => s.step_id === currentStep.step_id) + 1]) {
                notifyStatus = 'approved';
            } else {
                notifyStatus = 'in_progress';
            }
        }
        console.log(`[ProcessRequest] Calling notifyRequestStatusChange. RequestID: ${request.request_id}, Status: ${notifyStatus}`)
        console.log(`[ProcessRequest] Calling notifyRequestStatusChange. RequestID: ${request.request_id}, Status: ${notifyStatus}`)
        // Run notification asynchronously to avoid blocking UI response (PDF generation is slow)
        notifyRequestStatusChange(request.request_id, notifyStatus, user.full_name).catch(err => console.error("Async Notification Error:", err));

        return { success: true }
    } catch (error) {
        console.error("Process Request Error:", error)
        return { success: false, error: "فشل تنفيذ الإجراء" }
    }
}

// ... existing stats/history functions ... (kept below implicitly by replacement scope)

// NEW: Submit Delegation Request
export async function submitDelegationRequest(requesterId: string, delegateeId: string, startDate: Date, endDate: Date, reason: string) {
    try {
        const requester = await db.users.findUnique({
            where: { university_id: requesterId },
            include: {
                departments_users_department_idTodepartments: {
                    include: { colleges: true }
                }
            }
        })
        if (!requester) return { success: false, error: "المستخدم غير موجود" }

        // 1. Find Dean of the College
        // Logic: Requester -> Department -> College -> Dean
        const college = requester.departments_users_department_idTodepartments?.colleges
        let deanId = college?.dean_id

        if (!deanId) {
            // Fallback: Check if requester IS the Dean? No, dean can't self-approve.
            // Check if specific catch-all Dean exists?
            // For MVP: Fail if no Dean found.
            return { success: false, error: "لم يتم العثور على عميد الكلية للموافقة" }
        }

        if (requester.user_id === deanId) {
            // If I am the Dean, I should probably ask the Rector/Admin? 
            // For simplicity, let's say Dean requests go to Admin.
            const admin = await db.roles.findUnique({ where: { role_name: 'admin' }, include: { users: true } })
            if (admin && admin.users.length > 0) {
                deanId = admin.users[0].user_id
            } else {
                return { success: false, error: "لا يوجد مسؤول أعلى للموافقة على طلب العميد" }
            }
        }

        // 2. Create Transaction
        await db.$transaction(async (tx) => {
            // Create Ad-hoc Workflow Step for Dean Approval
            const step = await tx.workflow_steps.create({
                data: {
                    order: 1,
                    name: "موافقة العميد / المدير",
                    approver_user_id: deanId,
                    is_final: true,
                    sla_hours: 24,
                    workflow_id: null // Ad-hoc
                }
            })

            // Create Request
            const refNo = `DEL-${Date.now()}` // Unique Reference
            await tx.requests.create({
                data: {
                    requester_id: requester.user_id,
                    reference_no: refNo,
                    status: 'pending',
                    current_step_id: step.step_id,
                    submission_data: {
                        type: 'SYSTEM_DELEGATION',
                        delegatee_university_id: delegateeId,
                        start_date: startDate,
                        end_date: endDate,
                        reason: reason
                    },
                    submitted_at: new Date()
                }
            })
        })

        return { success: true }
    } catch (error) {
        console.error("Submit Delegation Error:", error)
        return { success: false, error: "فشل في تقديم طلب التفويض" }
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

        // Pending in inbox (including Delegations)
        const now = new Date()
        const activeDelegations = await db.delegations.findMany({
            where: {
                grantee_user_id: user.user_id,
                is_active: true,
                starts_at: { lte: now },
                ends_at: { gte: now }
            },
            include: {
                users_delegations_grantor_user_idTousers: {
                    select: { role_id: true }
                }
            }
        })

        const grantorIds = activeDelegations
            .map(d => d.grantor_user_id)
            .filter(id => id !== null) as number[]

        const grantorRoleIds = activeDelegations
            .map(d => d.users_delegations_grantor_user_idTousers?.role_id)
            .filter(id => id !== undefined && id !== null) as number[]

        const targetUserIds = [user.user_id, ...grantorIds]
        const targetRoleIds = [user.role_id, ...grantorRoleIds]

        const pendingCount = await db.requests.count({
            where: {
                status: "pending",
                OR: [
                    { workflow_steps: { approver_role_id: { in: targetRoleIds } } },
                    { workflow_steps: { approver_user_id: { in: targetUserIds } } }
                ]
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


// Get history of interactions between an employee and a specific requester
export async function getRequesterInteractionHistory(employeeId: string, applicantName: string) {
    try {
        const user = await db.users.findUnique({
            where: { university_id: employeeId },
        })

        if (!user) throw new Error("Employee not found")

        // Find actions performed by this employee on requests from this specific applicant
        // We filter requests by the applicant's name (since we might not have ID in the frontend list)
        const interactions = await db.request_actions.findMany({
            where: {
                actor_id: user.user_id,
                requests: {
                    users: {
                        full_name: applicantName
                    }
                }
            },
            include: {
                requests: {
                    include: {
                        form_templates: true,
                        users: { // Include user details for bio
                            include: {
                                departments_users_department_idTodepartments: {
                                    include: {
                                        colleges: true
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        })

        if (interactions.length === 0) {
            return { success: true, interactions: [], requesterBio: null }
        }

        // Deduplicate requests - keep only the latest action for each request
        const uniqueInteractions = interactions.reduce((acc, current) => {
            const x = acc.find(item => item.request_id === current.request_id);
            if (!x) {
                return acc.concat([current]);
            } else {
                return acc;
            }
        }, [] as typeof interactions);

        // Get requester bio from the first interaction (they are all the same requester)
        const requester = interactions[0]?.requests?.users;
        const departmentInfo = requester?.departments_users_department_idTodepartments;

        const requesterBio = requester ? {
            name: requester.full_name,
            university_id: requester.university_id,
            department: departmentInfo?.dept_name,
            college: departmentInfo?.colleges?.name,
        } : null;

        return {
            success: true,
            requesterBio,
            interactions: uniqueInteractions.map((a: any) => ({
                id: a.action_id.toString(),
                requestId: a.request_id?.toString(),
                requestType: a.requests?.form_templates?.name || "General",
                action: a.action,
                date: a.created_at?.toISOString().split('T')[0],
                comment: a.comment,
                originalStatus: a.requests?.status
            }))
        }
    } catch (error) {
        console.error("Interaction History Error:", error)
        return { success: false, error: "فشل في جلب سجل التعاملات" }
    }
}

// Get colleagues for delegation (Same Department/College)
export async function getDepartmentColleagues(userId: string) {
    try {
        const user = await db.users.findUnique({
            where: { university_id: userId },
            include: {
                roles: true,
                departments_users_department_idTodepartments: {
                    include: { colleges: true }
                },
                colleges: true
            }
        })

        if (!user) return { success: false, error: "المستخدم غير موجود" }

        let whereClause: any = {
            user_id: { not: user.user_id },
            is_active: true
        }

        let collegeId = null
        if (user.roles.role_name === 'dean') {
            const deanCollege = await db.colleges.findFirst({ where: { dean_id: user.user_id } })
            if (deanCollege) collegeId = deanCollege.college_id
        }

        if (collegeId) {
            whereClause.departments_users_department_idTodepartments = {
                college_id: collegeId
            }
        } else if (user.department_id) {
            whereClause.department_id = user.department_id
        } else {
            return { success: true, users: [] }
        }

        const colleagues = await db.users.findMany({
            where: whereClause,
            select: {
                university_id: true,
                full_name: true,
                roles: { select: { role_name: true } }
            },
            orderBy: { full_name: 'asc' }
        })

        return {
            success: true,
            users: colleagues.map(u => ({
                id: u.university_id,
                name: `${u.full_name} (${u.roles.role_name})`
            }))
        }
    } catch (error) {
        console.error("Get Colleagues Error:", error)
        return { success: false, error: "فشل في تحميل قائمة الزملاء" }
    }
}
