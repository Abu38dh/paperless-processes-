"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

/**
 * Get all colleges with their deans
 */
export async function getAllColleges() {
    try {
        const colleges = await db.colleges.findMany({
            include: {
                users: true, // dean
                departments: {
                    include: {
                        users_departments_manager_idTousers: true // manager
                    }
                }
            },
            orderBy: { name: 'asc' }
        })

        return {
            success: true,
            data: colleges
        }
    } catch (error) {
        console.error("Get Colleges Error:", error)
        return { success: false, error: "فشل في تحميل الكليات" }
    }
}

/**
 * Create new college
 */
export async function createCollege(data: {
    name: string
    dean_id?: number
}) {
    try {
        const college = await db.colleges.create({
            data: {
                name: data.name,
                dean_id: data.dean_id || null
            }
        })

        revalidatePath('/admin')
        return { success: true, data: college }
    } catch (error) {
        console.error("Create College Error:", error)
        return { success: false, error: "فشل في إنشاء الكلية" }
    }
}

/**
 * Update college
 */
export async function updateCollege(
    collegeId: number,
    data: {
        name?: string
        dean_id?: number | null
    }
) {
    try {
        const updateData: any = {}
        if (data.name !== undefined) updateData.name = data.name
        if (data.dean_id !== undefined) updateData.dean_id = data.dean_id

        const college = await db.colleges.update({
            where: { college_id: collegeId },
            data: updateData
        })

        revalidatePath('/admin')
        return { success: true, data: college }
    } catch (error) {
        console.error("Update College Error:", error)
        return { success: false, error: "فشل في تحديث الكلية" }
    }
}

/**
 * Delete college
 */
export async function deleteCollege(collegeId: number) {
    try {
        // Check if college has departments
        const departments = await db.departments.findMany({
            where: { college_id: collegeId }
        })

        if (departments.length > 0) {
            return {
                success: false,
                error: "لا يمكن حذف الكلية لأنها تحتوي على أقسام"
            }
        }

        await db.colleges.delete({
            where: { college_id: collegeId }
        })

        revalidatePath('/admin')
        return { success: true }
    } catch (error) {
        console.error("Delete College Error:", error)
        return { success: false, error: "فشل في حذف الكلية" }
    }
}

/**
 * Get all departments (optionally filtered by college)
 */
export async function getAllDepartments(collegeId?: number) {
    try {
        const where = collegeId ? { college_id: collegeId } : {}

        const departments = await db.departments.findMany({
            where,
            include: {
                colleges: true,
                users_departments_manager_idTousers: true, // manager
                users_users_department_idTodepartments: { // users in department
                    take: 5 // Limit for performance
                }
            },
            orderBy: { dept_name: 'asc' }
        })

        return {
            success: true,
            data: departments
        }
    } catch (error) {
        console.error("Get Departments Error:", error)
        return { success: false, error: "فشل في تحميل الأقسام" }
    }
}

/**
 * Create new department
 */
export async function createDepartment(data: {
    dept_name: string
    college_id?: number | null
    manager_id?: number | null
}) {
    try {
        const department = await db.departments.create({
            data: {
                dept_name: data.dept_name,
                college_id: data.college_id || null,
                manager_id: data.manager_id || null
            }
        })

        revalidatePath('/admin')
        return { success: true, data: department }
    } catch (error) {
        console.error("Create Department Error:", error)
        return { success: false, error: "فشل في إنشاء القسم" }
    }
}

/**
 * Update department
 */
export async function updateDepartment(
    departmentId: number,
    data: {
        dept_name?: string
        college_id?: number
        manager_id?: number | null
    }
) {
    try {
        const updateData: any = {}
        if (data.dept_name !== undefined) updateData.dept_name = data.dept_name
        if (data.college_id !== undefined) updateData.college_id = data.college_id
        if (data.manager_id !== undefined) updateData.manager_id = data.manager_id

        const department = await db.departments.update({
            where: { department_id: departmentId },
            data: updateData
        })

        revalidatePath('/admin')
        return { success: true, data: department }
    } catch (error) {
        console.error("Update Department Error:", error)
        return { success: false, error: "فشل في تحديث القسم" }
    }
}

/**
 * Delete department
 */
export async function deleteDepartment(departmentId: number) {
    try {
        // Check if department has users
        const users = await db.users.findMany({
            where: { department_id: departmentId }
        })

        if (users.length > 0) {
            return {
                success: false,
                error: "لا يمكن حذف القسم لأنه يحتوي على مستخدمين"
            }
        }

        await db.departments.delete({
            where: { department_id: departmentId }
        })

        revalidatePath('/admin')
        return { success: true }
    } catch (error) {
        console.error("Delete Department Error:", error)
        return { success: false, error: "فشل في حذف القسم" }
    }
}

/**
 * Get eligible users for dean/manager roles
 */
export async function getEligibleManagers() {
    try {
        const users = await db.users.findMany({
            where: {
                is_active: true,
                roles: {
                    role_name: {
                        in: ['employee', 'admin']
                    }
                }
            },
            include: {
                roles: true,
                departments_users_department_idTodepartments: {
                    include: {
                        colleges: true
                    }
                }
            },
            orderBy: { full_name: 'asc' }
        })

        return {
            success: true,
            data: users
        }
    } catch (error) {
        console.error("Get Eligible Managers Error:", error)
        return { success: false, error: "فشل في تحميل المستخدمين المؤهلين" }
    }
}
