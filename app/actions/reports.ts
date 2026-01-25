"use server"

import { db } from "@/lib/db"

/**
 * Get SLA compliance report
 */
export async function getSLAComplianceReport(startDate?: Date, endDate?: Date) {
    try {
        const whereClause: any = {}

        if (startDate || endDate) {
            whereClause.submitted_at = {}
            if (startDate) whereClause.submitted_at.gte = startDate
            if (endDate) whereClause.submitted_at.lte = endDate
        }

        const requests = await db.requests.findMany({
            where: whereClause,
            include: {
                workflow_steps: true,
                request_actions: {
                    orderBy: { created_at: 'asc' }
                },
                form_templates: true
            }
        })

        // Calculate SLA compliance for each request
        const slaData = requests.map(request => {
            const actions = request.request_actions
            if (actions.length === 0 || !request.workflow_steps?.sla_hours) {
                return null
            }

            const submittedAt = request.submitted_at
            const firstAction = actions[0]?.created_at

            if (!submittedAt || !firstAction) return null

            const timeDiff = firstAction.getTime() - submittedAt.getTime()
            const hoursElapsed = timeDiff / (1000 * 60 * 60)
            const slaHours = request.workflow_steps.sla_hours || 0

            return {
                requestId: request.request_id,
                referenceNo: request.reference_no,
                formName: request.form_templates?.name || "غير محدد",
                slaHours: slaHours,
                hoursElapsed: Math.round(hoursElapsed * 100) / 100,
                compliant: hoursElapsed <= slaHours,
                status: request.status
            }
        }).filter(Boolean)

        const totalWithSLA = slaData.length
        const compliant = slaData.filter(r => r?.compliant).length
        const nonCompliant = totalWithSLA - compliant
        const complianceRate = totalWithSLA > 0 ? Math.round((compliant / totalWithSLA) * 100) : 0

        return {
            success: true,
            data: {
                summary: {
                    totalWithSLA,
                    compliant,
                    nonCompliant,
                    complianceRate
                },
                requests: slaData
            }
        }
    } catch (error) {
        console.error("SLA Compliance Report Error:", error)
        return { success: false, error: "فشل في إنشاء تقرير الامتثال" }
    }
}

/**
 * Get employee performance report
 */
export async function getEmployeePerformanceReport(
    employeeId: string,
    startDate?: Date,
    endDate?: Date
) {
    try {
        const user = await db.users.findUnique({
            where: { university_id: employeeId }
        })

        if (!user) return { success: false, error: "الموظف غير موجود" }

        const whereClause: any = {
            actor_id: user.user_id
        }

        if (startDate || endDate) {
            whereClause.created_at = {}
            if (startDate) whereClause.created_at.gte = startDate
            if (endDate) whereClause.created_at.lte = endDate
        }

        const actions = await db.request_actions.findMany({
            where: whereClause,
            include: {
                requests: {
                    include: {
                        form_templates: true
                    }
                }
            }
        })

        const totalActions = actions.length
        const approvals = actions.filter(a => a.action === 'approve').length
        const rejections = actions.filter(a => a.action === 'reject').length

        // Calculate average response time
        const responseTimes = actions.map(action => {
            const request = action.requests
            if (!request?.submitted_at || !action.created_at) return null

            const timeDiff = action.created_at.getTime() - request.submitted_at.getTime()
            return timeDiff / (1000 * 60 * 60) // hours
        }).filter(Boolean) as number[]

        const averageResponseTime = responseTimes.length > 0
            ? Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 100) / 100
            : 0

        // Group by form type
        const byFormType: Record<string, number> = {}
        actions.forEach(action => {
            const formName = action.requests?.form_templates?.name || "غير محدد"
            byFormType[formName] = (byFormType[formName] || 0) + 1
        })

        return {
            success: true,
            data: {
                employee: {
                    id: user.university_id,
                    name: user.full_name
                },
                summary: {
                    totalActions,
                    approvals,
                    rejections,
                    approvalRate: totalActions > 0 ? Math.round((approvals / totalActions) * 100) : 0,
                    averageResponseTime
                },
                byFormType
            }
        }
    } catch (error) {
        console.error("Employee Performance Report Error:", error)
        return { success: false, error: "فشل في إنشاء تقرير الأداء" }
    }
}

/**
 * Get average processing time for a form
 */
export async function getAverageProcessingTime(formId: number) {
    try {
        const requests = await db.requests.findMany({
            where: {
                form_id: formId,
                status: { in: ['approved', 'rejected'] }
            },
            include: {
                request_actions: {
                    orderBy: { created_at: 'desc' },
                    take: 1
                }
            }
        })

        const processingTimes = requests.map(request => {
            const lastAction = request.request_actions[0]
            if (!request.submitted_at || !lastAction?.created_at) return null

            const timeDiff = lastAction.created_at.getTime() - request.submitted_at.getTime()
            return timeDiff / (1000 * 60 * 60) // hours
        }).filter(Boolean) as number[]

        const averageTime = processingTimes.length > 0
            ? Math.round((processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length) * 100) / 100
            : 0

        return {
            success: true,
            data: {
                formId,
                totalCompleted: requests.length,
                averageProcessingTimeHours: averageTime,
                averageProcessingTimeDays: Math.round((averageTime / 24) * 100) / 100
            }
        }
    } catch (error) {
        console.error("Average Processing Time Error:", error)
        return { success: false, error: "فشل في حساب متوسط وقت المعالجة" }
    }
}

/**
 * Get department statistics
 */
export async function getDepartmentStatistics(departmentId: number) {
    try {
        const department = await db.departments.findUnique({
            where: { department_id: departmentId },
            include: {
                colleges: true,
                users_users_department_idTodepartments: true
            }
        })

        if (!department) return { success: false, error: "القسم غير موجود" }

        // Get all users in this department
        const userIds = department.users_users_department_idTodepartments.map(u => u.user_id)

        // Get requests from department users
        const requests = await db.requests.findMany({
            where: {
                requester_id: { in: userIds }
            },
            include: {
                form_templates: true
            }
        })

        // Statistics
        const total = requests.length
        const byStatus = await db.requests.groupBy({
            by: ['status'],
            where: { requester_id: { in: userIds } },
            _count: true
        })

        const byForm = await db.requests.groupBy({
            by: ['form_id'],
            where: { requester_id: { in: userIds } },
            _count: true
        })

        return {
            success: true,
            data: {
                department: {
                    id: department.department_id,
                    name: department.dept_name,
                    college: department.colleges?.name || "غير محدد",
                    totalUsers: userIds.length
                },
                requests: {
                    total,
                    byStatus,
                    byForm
                }
            }
        }
    } catch (error) {
        console.error("Department Statistics Error:", error)
        return { success: false, error: "فشل في تحميل إحصائيات القسم" }
    }
}
