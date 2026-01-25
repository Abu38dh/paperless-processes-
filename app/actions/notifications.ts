"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

/**
 * Get user notifications
 */
export async function getUserNotifications(userId: string, limit: number = 20) {
    try {
        const user = await db.users.findUnique({
            where: { university_id: userId }
        })

        if (!user) {
            return { success: false, error: "المستخدم غير موجود" }
        }

        const notifications = await db.notifications.findMany({
            where: { user_id: user.user_id },
            orderBy: { created_at: 'desc' },
            take: limit
        })

        return {
            success: true,
            data: notifications
        }
    } catch (error) {
        console.error("Get Notifications Error:", error)
        return { success: false, error: "فشل في تحميل الإشعارات" }
    }
}

/**
 * Create notification for a user
 */
export async function createNotification(data: {
    userId: string
    title: string
    message: string
    link?: string
}) {
    try {
        const user = await db.users.findUnique({
            where: { university_id: data.userId }
        })

        if (!user) {
            return { success: false, error: "المستخدم غير موجود" }
        }

        const notification = await db.notifications.create({
            data: {
                user_id: user.user_id,
                title: data.title,
                message: data.message,
                link: data.link || null
            }
        })

        // revalidatePath('/')
        return { success: true, data: notification }
    } catch (error) {
        console.error("Create Notification Error:", error)
        return { success: false, error: "فشل في إنشاء الإشعار" }
    }
}

/**
 * Create notification for multiple users
 */
export async function createBulkNotifications(data: {
    userIds: string[]
    title: string
    message: string
    link?: string
}) {
    try {
        const users = await db.users.findMany({
            where: {
                university_id: { in: data.userIds }
            }
        })

        if (users.length === 0) {
            return { success: false, error: "لم يتم العثور على مستخدمين" }
        }

        await db.notifications.createMany({
            data: users.map(user => ({
                user_id: user.user_id,
                title: data.title,
                message: data.message,
                link: data.link || null
            }))
        })

        // revalidatePath('/')
        return { success: true }
    } catch (error) {
        console.error("Create Bulk Notifications Error:", error)
        return { success: false, error: "فشل في إنشاء الإشعارات" }
    }
}

/**
 * Helper: Notify request submitter about status change
 */
export async function notifyRequestStatusChange(
    requestId: number,
    newStatus: string,
    actorName: string
) {
    try {
        const request = await db.requests.findUnique({
            where: { request_id: requestId },
            include: {
                users: true,
                form_templates: true
            }
        })

        if (!request) return { success: false }

        const statusMessages: Record<string, string> = {
            approved: `تمت الموافقة على طلبك رقم ${request.reference_no} بواسطة ${actorName}`,
            rejected: `تم رفض طلبك رقم ${request.reference_no} بواسطة ${actorName}`,
            pending: `طلبك رقم ${request.reference_no} قيد المراجعة`,
            in_progress: `طلبك رقم ${request.reference_no} قيد التنفيذ`,
            returned: `تم إعادة طلبك رقم ${request.reference_no} للتعديل بواسطة ${actorName}`
        }

        await createNotification({
            userId: request.users.university_id,
            title: "تحديث حالة الطلب",
            message: statusMessages[newStatus] || `تم تحديث طلبك رقم ${request.reference_no}`,
            link: `/requests/${request.request_id}`
        })

        return { success: true }
    } catch (error) {
        console.error("Notify Request Status Error:", error)
        return { success: false }
    }
}

/**
 * Helper: Notify approver about new request
 */
export async function notifyApproverNewRequest(
    approverRoleId: number,
    requestId: number,
    requestType: string,
    requesterName: string
) {
    try {
        // Get all users with this role
        const approvers = await db.users.findMany({
            where: {
                role_id: approverRoleId,
                is_active: true
            }
        })

        if (approvers.length === 0) return { success: false }

        const request = await db.requests.findUnique({
            where: { request_id: requestId },
            select: { reference_no: true }
        })

        if (!request) return { success: false }

        await createBulkNotifications({
            userIds: approvers.map(a => a.university_id),
            title: "طلب جديد للمراجعة",
            message: `طلب ${requestType} جديد من ${requesterName} - رقم المرجع: ${request.reference_no}`,
            link: `/requests/${requestId}`
        })

        return { success: true }
    } catch (error) {
        console.error("Notify Approver Error:", error)
        return { success: false }
    }
}

/**
 * Helper: Notify specific user approver about new request
 */
export async function notifyUserApproverNewRequest(
    approverUserId: number,
    requestId: number,
    requestType: string,
    requesterName: string
) {
    try {
        const approver = await db.users.findUnique({
            where: { user_id: approverUserId }
        })

        if (!approver) return { success: false }

        const request = await db.requests.findUnique({
            where: { request_id: requestId },
            select: { reference_no: true }
        })

        if (!request) return { success: false }

        await createNotification({
            userId: approver.university_id,
            title: "طلب جديد للمراجعة",
            message: `طلب ${requestType} جديد من ${requesterName} - رقم المرجع: ${request.reference_no}`,
            link: `/requests/${requestId}`
        })

        return { success: true }
    } catch (error) {
        console.error("Notify User Approver Error:", error)
        return { success: false }
    }
}
