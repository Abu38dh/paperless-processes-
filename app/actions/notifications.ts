"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { queueWhatsAppMessage } from "@/lib/whatsapp-queue"
import { sendEmail } from "@/lib/email-service"
import fs from 'fs'
import path from 'path'

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
    console.log(`[NotifyRequestStatusChange] Triggered for RequestID: ${requestId}, Status: ${newStatus}`)
    try {
        const request = await db.requests.findUnique({
            where: { request_id: requestId },
            include: {
                users: {
                    include: {
                        departments_users_department_idTodepartments: {
                            include: { colleges: true }
                        }
                    }
                },
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

        // WhatsApp Integration (Queue)
        if (newStatus === 'approved' && request.users.phone) {
             let pdfPath = null;
             
             // Generate PDF if template exists
             if (request.form_templates?.pdf_template) {
                try {
                    const template = request.form_templates.pdf_template;
                    // Replace variables
                    const data = {
                        StudentName: request.users.full_name,
                        UniversityID: request.users.university_id,
                        RequestID: request.reference_no,
                        RequestDate: new Date(request.submitted_at || new Date()).toLocaleDateString('ar-SA'),
                        RequestType: request.form_templates.name,
                        College: request.users.departments_users_department_idTodepartments?.colleges?.name || "---",
                        Department: request.users.departments_users_department_idTodepartments?.dept_name || "---"
                    };

                    let content = template;
                    Object.keys(data).forEach(key => {
                        const regex = new RegExp(`{${key}}`, 'gi');
                        // @ts-ignore
                        content = content.replace(regex, data[key]);
                    });

                    // Helper to get Base64 Logo
                    let logoSrc = "";
                    try {
                        const logoPath = path.join(process.cwd(), 'public', 'university-logo.png');
                        if (fs.existsSync(logoPath)) {
                            const logoBase64 = fs.readFileSync(logoPath).toString('base64');
                            logoSrc = `data:image/png;base64,${logoBase64}`;
                        }
                    } catch (e) { console.error("Logo load failed", e); }

                    // Improved Header with Table (Better for PDF)
                    const headerHtml = `
                        <table style="width: 100%; border-bottom: 3px solid #f97316; padding-bottom: 10px; margin-bottom: 30px; font-family: 'Cairo', sans-serif;">
                            <tr>
                                <td style="text-align: right; width: 35%; vertical-align: top;">
                                    <div style="font-weight: bold; font-size: 14pt; color: #0f172a; margin-bottom: 4px;">الجمهورية اليمنية</div>
                                    <div style="font-size: 11pt; color: #334155;">وزارة التعليم العالي والبحث العلمي</div>
                                    <div style="font-size: 11pt; color: #334155;">والتعليم الفني والتدريب المهني</div>
                                    <div style="font-size: 18pt; font-weight: bold; color: #0f172a; margin-top: 8px;">جامعة العرب</div>
                                </td>
                                <td style="text-align: center; width: 30%; vertical-align: middle;">
                                    ${logoSrc ? `<img src="${logoSrc}" style="width: 110px; height: auto;" />` : ''}
                                </td>
                                <td style="text-align: left; width: 35%; vertical-align: top; direction: ltr;">
                                    <div style="font-weight: bold; font-size: 14pt; color: #0f172a; margin-bottom: 4px;">Republic of Yemen</div>
                                    <div style="font-size: 11pt; color: #334155;">Ministry of Higher Education &</div>
                                    <div style="font-size: 11pt; color: #334155;">Scientific Research</div>
                                    <div style="font-size: 18pt; font-weight: bold; color: #0f172a; margin-top: 8px;">AL-ARAB UNIVERSITY</div>
                                </td>
                            </tr>
                        </table>
                    `;

                    // Footer with Signature placeholders
                    const footerHtml = `
                        <div style="margin-top: 50px; display: flex; justify-content: space-between; page-break-inside: avoid;">
                            <div style="text-align: center; width: 40%;">
                                <div style="font-weight: bold; margin-bottom: 60px;">المختص</div>
                                <div>...........................</div>
                            </div>
                            <div style="text-align: center; width: 40%;">
                                <div style="font-weight: bold; margin-bottom: 60px;">العميد / المدير المختص</div>
                                <div>...........................</div>
                            </div>
                        </div>
                        <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; text-align: center; font-size: 10pt; color: #64748b;">
                            وثيقة إلكترونية صادرة من نظام الطلبات - جامعة العرب
                            <br/>
                            الرقم المرجعي: ${request.reference_no} | التاريخ: ${new Date().toLocaleDateString('ar-SA')}
                        </div>
                    `;

                    // Combined HTML with Container
                    const html = `
                        <div style="width: 100%; max-width: 210mm; margin: 0 auto; padding: 40px; box-sizing: border-box;">
                            ${headerHtml}
                            
                            <div style="text-align: center; margin-bottom: 30px;">
                                <h1 style="font-size: 24pt; font-weight: bold; text-decoration: underline; text-underline-offset: 8px;">قرار إداري / إفادة</h1>
                            </div>

                            <div style="font-size: 14pt; line-height: 2; text-align: justify; min-height: 200px;">
                                ${content}
                            </div>

                            ${footerHtml}
                        </div>
                    `;

                    // Generate
                    const { generatePdfServer } = await import('@/lib/server-pdf-generator');
                    const pdfBuffer = await generatePdfServer({ htmlContent: html });

                    // Save to public/uploads/generated-pdfs
                    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'generated-pdfs');
                    if (!fs.existsSync(uploadDir)) {
                        fs.mkdirSync(uploadDir, { recursive: true });
                    }
                    const fileName = `Decision-${request.reference_no}.pdf`;
                    const filePath = path.join(uploadDir, fileName);
                    fs.writeFileSync(filePath, pdfBuffer);

                    // pdfPath = filePath; // Internal path
                    // For WhatsApp Bot, we might need absolute path or URL.
                    // Bot is running locally so absolute path is fine.
                    pdfPath = filePath;
                    console.log("Generated PDF for WhatsApp:", pdfPath);

                } catch (err) {
                    console.error("Failed to generate PDF for WhatsApp:", err);
                }
             }

             const wapMessage = `*جامعة العرب - نظام المراسلات*\n\nعزيزي الطالب/ة ${request.users.full_name}،\n\nتمت *الموافقة* على طلبك رقم *${request.reference_no}* (${request.form_templates?.name}).\n\nتجدون مرفقاً نسخة من القرار الرسمي.\n\nرابط الطلب: ${process.env.NEXTAUTH_URL}/requests/${request.request_id}`
             
             // Pass pdfPath to queue
             await queueWhatsAppMessage(request.users.phone, wapMessage, pdfPath)
             
             // Send Email
             const userEmail = (request.users as any).email;
             if (userEmail) {
                const emailSubject = `تمت الموافقة على طلبك رقم ${request.reference_no}`;
                const emailText = `عزيزي الطالب/ة ${request.users.full_name}،\n\nنود إبلاغك بأنه تمت الموافقة على طلبك رقم ${request.reference_no} (${request.form_templates?.name}).\n\nيمكنك متابعة وتنزيل القرار الرسمي وتفاصيل الطلب من خلال الرابط التالي:\n${process.env.NEXTAUTH_URL}/requests/${request.request_id}\n\nمع تحيات,\nنظام طلبات جامعة العرب`;
                await sendEmail(userEmail, emailSubject, emailText);
             }
        }

        // WhatsApp Integration (Queue) - Returned for Modification
        if (newStatus === 'returned' && request.users.phone) {
            // Fetch the last action to get the comment
            const lastAction = await db.request_actions.findFirst({
                where: { request_id: requestId },
                orderBy: { created_at: 'desc' }
            });
            const comment = lastAction?.comment || "لا توجد ملاحظات إضافية";

            const wapMessage = `*جامعة العرب - نظام المراسلات*\n\nعزيزي الطالب/ة ${request.users.full_name}،\n\nتم *إعادة* طلبك رقم *${request.reference_no}* للتعديل.\n\n📝 *الملاحظات:*\n${comment}\n\nيرجى الدخول للموقع لتعديل الطلب وإعادة إرساله.\n\nرابط الطلب: ${process.env.NEXTAUTH_URL}/requests/${request.request_id}`

            await queueWhatsAppMessage(request.users.phone, wapMessage)
            
            // Send Email
            const userEmail = (request.users as any).email;
            if (userEmail) {
                const emailSubject = `إعادة طلبك رقم ${request.reference_no} للتعديل`;
                const emailText = `عزيزي الطالب/ة ${request.users.full_name}،\n\nتبين لنا أن طلبك رقم ${request.reference_no} (${request.form_templates?.name}) بحاجة لبعض التعديلات قبل القدرة على الموافقة عليه.\n\nالملاحظات من الموظف المختص:\n${comment}\n\nيرجى الدخول للنظام وإجراء التعديلات المطلوبة لإعادة التقديم.\nرابط الطلب: ${process.env.NEXTAUTH_URL}/requests/${request.request_id}\n\nمع تحيات,\nنظام طلبات جامعة العرب`;
                await sendEmail(userEmail, emailSubject, emailText);
            }
        }

        // WhatsApp Integration (Queue) - Rejected
        if (newStatus === 'rejected' && request.users.phone) {
            // Fetch the last action to get the rejection reason
            const lastAction = await db.request_actions.findFirst({
                where: { request_id: requestId },
                orderBy: { created_at: 'desc' }
            });
            const reason = lastAction?.comment || "لا يوجد سبب محدد";

            const wapMessage = `*جامعة العرب - نظام المراسلات*\n\nعزيزي الطالب/ة ${request.users.full_name}،\n\nنأسف لإبلاغك بأنه تم *رفض* طلبك رقم *${request.reference_no}* (${request.form_templates?.name}).\n\n❌ *سبب الرفض:*\n${reason}\n\nيمكنك التواصل مع الجهة المختصة للاستفسار.\n\nرابط الطلب: ${process.env.NEXTAUTH_URL}/requests/${request.request_id}`

            await queueWhatsAppMessage(request.users.phone, wapMessage)
            
            // Send Email
            const userEmail = (request.users as any).email;
            if (userEmail) {
                const emailSubject = `تم رفض طلبك رقم ${request.reference_no}`;
                const emailText = `عزيزي الطالب/ة ${request.users.full_name}،\n\nنأسف لإبلاغك بأنه تم رفض طلبك رقم ${request.reference_no} (${request.form_templates?.name}).\n\nسبب الرفض الموجه من الموظف المختص:\n${reason}\n\nللتفاصيل، يمكنك التواصل مع شؤون الطلاب أو زيارة الرابط أدناه:\n${process.env.NEXTAUTH_URL}/requests/${request.request_id}\n\nمع تحيات,\nنظام طلبات جامعة العرب`;
                await sendEmail(userEmail, emailSubject, emailText);
            }
        }

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

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: number) {
    try {
        await db.notifications.update({
            where: { notification_id: notificationId },
            data: { is_read: true }
        })
        return { success: true }
    } catch (error) {
        console.error("Mark Notification Read Error:", error)
        return { success: false }
    }
}
