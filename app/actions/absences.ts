"use server"

import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"

// ============================================================
// COLLEGES & DEPARTMENTS — raw SQL to bypass outdated Prisma client
// ============================================================

export async function getCollegesWithDepartments(employeeId?: string) {
    try {
        let collegeFilter: number | null = null
        if (employeeId) {
            const empRows = await db.$queryRaw<any[]>`
                SELECT d.college_id
                FROM users u
                LEFT JOIN departments d ON d.department_id = u.department_id
                WHERE u.university_id = ${employeeId}
                LIMIT 1
            `
            if (empRows.length > 0 && empRows[0].college_id) {
                collegeFilter = empRows[0].college_id
            }
        }

        // Fetch raw data via SQL (bypasses Prisma client schema validation)
        let collegesRaw: any[]
        if (collegeFilter !== null) {
            collegesRaw = await db.$queryRaw<any[]>`
                SELECT college_id, name FROM colleges WHERE college_id = ${collegeFilter} ORDER BY name ASC
            `
        } else {
            collegesRaw = await db.$queryRaw<any[]>`
                SELECT college_id, name FROM colleges ORDER BY name ASC
            `
        }

        const deptsRaw = await db.$queryRaw<any[]>`
            SELECT department_id, dept_name, college_id FROM departments ORDER BY dept_name ASC
        `
        const levelsRaw = await db.$queryRaw<any[]>`
            SELECT l.level_id, l.name, l."order", l.department_id,
                   COUNT(DISTINCT u.user_id)::int AS user_count
            FROM levels l
            LEFT JOIN users u ON u.level_id = l.level_id
            GROUP BY l.level_id, l.name, l."order", l.department_id
            ORDER BY l."order" ASC
        `
        const termsRaw = await db.$queryRaw<any[]>`
            SELECT term_id, level_id, name, "order" FROM level_terms ORDER BY "order" ASC
        `
        const subjectsRaw = await db.$queryRaw<any[]>`
            SELECT subject_id, name, code, term_id FROM subjects ORDER BY name ASC
        `

        // Assemble hierarchy manually
        const result = collegesRaw.map((c: any) => ({
            ...c,
            departments: deptsRaw
                .filter((d: any) => d.college_id === c.college_id)
                .map((d: any) => ({
                    ...d,
                    levels: levelsRaw
                        .filter((l: any) => l.department_id === d.department_id)
                        .map((l: any) => ({
                            ...l,
                            order: Number(l.order),
                            _count: { users: Number(l.user_count) },
                            terms: termsRaw
                                .filter((t: any) => t.level_id === l.level_id)
                                .map((t: any) => ({
                                    ...t,
                                    subjects: subjectsRaw.filter((s: any) => s.term_id === t.term_id)
                                }))
                        }))
                }))
        }))

        return { success: true, data: result }
    } catch (e) {
        console.error("getCollegesWithDepartments error:", e)
        return { success: false, error: "فشل تحميل الكليات" }
    }
}

// ============================================================
// LEVELS
// ============================================================

export async function getLevels(employeeId?: string) {
    try {
        let collegeFilter: number | null = null
        if (employeeId) {
            const empRows = await db.$queryRaw<any[]>`
                SELECT d.college_id 
                FROM users u
                LEFT JOIN departments d ON d.department_id = u.department_id
                WHERE u.university_id = ${employeeId}
                LIMIT 1
            `
            if (empRows.length > 0 && empRows[0].college_id) {
                collegeFilter = empRows[0].college_id
            }
        }

        // Raw SQL with optional college filter
        let rows: any[]
        if (collegeFilter !== null) {
            rows = await db.$queryRaw<any[]>`
                SELECT l.level_id, l.name, l."order", l.department_id,
                       d.dept_name, d.college_id,
                       c.name AS college_name,
                       COUNT(DISTINCT u.user_id)::int AS user_count
                FROM levels l
                LEFT JOIN departments d ON d.department_id = l.department_id
                LEFT JOIN colleges c ON c.college_id = d.college_id
                LEFT JOIN users u ON u.level_id = l.level_id
                WHERE d.college_id = ${collegeFilter}
                GROUP BY l.level_id, l.name, l."order", l.department_id, d.dept_name, d.college_id, c.name
                ORDER BY l."order" ASC
            `
        } else {
            rows = await db.$queryRaw<any[]>`
                SELECT l.level_id, l.name, l."order", l.department_id,
                       d.dept_name, d.college_id,
                       c.name AS college_name,
                       COUNT(DISTINCT u.user_id)::int AS user_count
                FROM levels l
                LEFT JOIN departments d ON d.department_id = l.department_id
                LEFT JOIN colleges c ON c.college_id = d.college_id
                LEFT JOIN users u ON u.level_id = l.level_id
                GROUP BY l.level_id, l.name, l."order", l.department_id, d.dept_name, d.college_id, c.name
                ORDER BY l."order" ASC
            `
        }

        const termsRaw = await db.$queryRaw<any[]>`
            SELECT term_id, level_id, name, "order" FROM level_terms ORDER BY "order" ASC
        `
        const subjectsRaw = await db.$queryRaw<any[]>`
            SELECT subject_id, name, code, term_id FROM subjects ORDER BY name ASC
        `
        const data = rows.map((r: any) => ({
            level_id: r.level_id,
            name: r.name,
            order: Number(r.order),
            department_id: r.department_id,
            departments: r.department_id ? {
                department_id: r.department_id,
                dept_name: r.dept_name,
                college_id: r.college_id,
                colleges: r.college_id ? { college_id: r.college_id, name: r.college_name } : null
            } : null,
            _count: { users: Number(r.user_count) },
            terms: termsRaw
                .filter((t: any) => t.level_id === r.level_id)
                .map((t: any) => ({
                    ...t,
                    subjects: subjectsRaw.filter((s: any) => s.term_id === t.term_id)
                }))
        }))
        return { success: true, data }
    } catch (e) {
        console.error("getLevels error:", e)
        return { success: false, error: "فشل تحميل المستويات" }
    }
}

export async function createLevel(name: string, order: number, departmentId: number) {
    try {
        // Use raw SQL to set department_id (new field)
        const result = await db.$queryRaw<any[]>`
            INSERT INTO levels (name, "order", department_id, created_at)
            VALUES (${name}, ${order}, ${departmentId}, NOW())
            RETURNING level_id, name, "order", department_id
        `
        return { success: true, data: result[0] }
    } catch (e) {
        console.error("createLevel error:", e)
        return { success: false, error: "فشل إنشاء المستوى" }
    }
}

export async function updateLevel(levelId: number, name: string, order: number, departmentId?: number) {
    try {
        if (departmentId !== undefined) {
            await db.$executeRaw`
                UPDATE levels SET name = ${name}, "order" = ${order}, department_id = ${departmentId}
                WHERE level_id = ${levelId}
            `
        } else {
            await db.$executeRaw`
                UPDATE levels SET name = ${name}, "order" = ${order}
                WHERE level_id = ${levelId}
            `
        }
        return { success: true }
    } catch (e) {
        console.error("updateLevel error:", e)
        return { success: false, error: "فشل تحديث المستوى" }
    }
}

export async function deleteLevel(levelId: number) {
    try {
        const usersCount = await db.users.count({ where: { level_id: levelId } })
        if (usersCount > 0) {
            return { success: false, error: "لا يمكن حذف المستوى لأنه يحتوي على طلاب مسجلين" }
        }

        await db.levels.delete({ where: { level_id: levelId } })
        return { success: true }
    } catch (e) {
        console.error("deleteLevel error:", e)
        return { success: false, error: "فشل حذف المستوى" }
    }
}

// ============================================================
// LEVEL TERMS (Semesters)
// ============================================================

export async function createLevelTerm(name: string, order: number, levelId: number) {
    try {
        const result = await db.$queryRaw<any[]>`
            INSERT INTO level_terms (name, "order", level_id, created_at)
            VALUES (${name}, ${order}, ${levelId}, NOW())
            RETURNING term_id, name, "order", level_id
        `
        return { success: true, data: result[0] }
    } catch (e) {
        console.error("createLevelTerm error:", e)
        return { success: false, error: "فشل إنشاء الفصل الدراسي" }
    }
}

export async function updateLevelTerm(termId: number, name: string, order: number) {
    try {
        await db.$executeRaw`
            UPDATE level_terms SET name = ${name}, "order" = ${order}
            WHERE term_id = ${termId}
        `
        return { success: true }
    } catch (e) {
        console.error("updateLevelTerm error:", e)
        return { success: false, error: "فشل تحديث الفصل الدراسي" }
    }
}

export async function deleteLevelTerm(termId: number) {
    try {
        const usersCount = await db.users.count({ where: { current_term_id: termId } })
        if (usersCount > 0) {
            return { success: false, error: "لا يمكن حذف الفصل الدراسي لأنه يحتوي على طلاب مسجلين" }
        }

        await db.$executeRaw`DELETE FROM level_terms WHERE term_id = ${termId}`
        return { success: true }
    } catch (e) {
        console.error("deleteLevelTerm error:", e)
        return { success: false, error: "فشل حذف الفصل الدراسي" }
    }
}

// ============================================================
// SUBJECTS
// ============================================================

export async function createSubject(termId: number, name: string, code?: string) {
    try {
        const subject = await db.subjects.create({ data: { term_id: termId, name, code } })
        return { success: true, data: subject }
    } catch (e) {
        console.error("createSubject error:", e)
        return { success: false, error: "فشل إنشاء المادة" }
    }
}

export async function updateSubject(subjectId: number, name: string, code?: string) {
    try {
        await db.subjects.update({ where: { subject_id: subjectId }, data: { name, code } })
        return { success: true }
    } catch (e) {
        console.error("updateSubject error:", e)
        return { success: false, error: "فشل تحديث المادة" }
    }
}

export async function deleteSubject(subjectId: number) {
    try {
        await db.subjects.delete({ where: { subject_id: subjectId } })
        return { success: true }
    } catch (e) {
        console.error("deleteSubject error:", e)
        return { success: false, error: "فشل حذف المادة" }
    }
}

// ============================================================
// STUDENT ABSENCES – fetch for employee view
// ============================================================

export async function getStudentAbsences(studentUniversityId: string) {
    try {
        // Fetch student basic info (no new relations needed here)
        const student = await db.users.findUnique({
            where: { university_id: studentUniversityId },
            select: {
                user_id: true,
                full_name: true,
                university_id: true,
                level_id: true,
                current_term_id: true
            }
        })

        if (!student) return { success: false, error: "الطالب غير موجود" }

        if (!student.level_id) {
            return {
                success: true,
                student: { full_name: student.full_name, university_id: student.university_id, level: null },
                subjects: []
            }
        }

        // Raw SQL to get level + department + college (bypasses old Prisma client)
        const levelRows = await db.$queryRaw<any[]>`
            SELECT l.level_id, l.name AS level_name,
                   d.department_id, d.dept_name,
                   c.college_id, c.name AS college_name
            FROM levels l
            LEFT JOIN departments d ON d.department_id = l.department_id
            LEFT JOIN colleges c ON c.college_id = d.college_id
            WHERE l.level_id = ${student.level_id}
        `
        const levelInfo = levelRows[0] ?? null

        // Filter by term if student is assigned to one, otherwise show all for level
        const subjectsWhereClause: any = { level_terms: { level_id: student.level_id } }
        if (student.current_term_id) {
            subjectsWhereClause.term_id = student.current_term_id
        }

        const subjects = await db.subjects.findMany({
            where: subjectsWhereClause,
            orderBy: { name: 'asc' },
            include: {
                level_terms: true,
                absences: {
                    where: { student_id: student.user_id },
                    include: {
                        absence_records: { orderBy: { absence_date: 'desc' } }
                    }
                }
            }
        })

        const result = subjects.map(s => ({
            subject_id: s.subject_id,
            name: s.name,
            code: s.code,
            term_name: s.level_terms?.name,
            total_absences: s.absences[0]?.total_absences ?? 0,
            excused_count: s.absences[0]?.excused_count ?? 0,
            absence_id: s.absences[0]?.absence_id ?? null,
            records: s.absences[0]?.absence_records ?? []
        }))

        return {
            success: true,
            student: {
                full_name: student.full_name,
                university_id: student.university_id,
                user_id: student.user_id,
                level: levelInfo ? {
                    level_id: levelInfo.level_id,
                    name: levelInfo.level_name,
                    departments: levelInfo.department_id ? {
                        department_id: levelInfo.department_id,
                        dept_name: levelInfo.dept_name,
                        colleges: levelInfo.college_id ? { college_id: levelInfo.college_id, name: levelInfo.college_name } : null
                    } : null
                } : null
            },
            subjects: result
        }
    } catch (e) {
        console.error("getStudentAbsences error:", e)
        return { success: false, error: "فشل تحميل بيانات الغياب" }

    }
}

// ============================================================
// ABSENCE RECORDS – add / mark excused / delete
// ============================================================

/**
 * Add a new absence record for a student in a subject.
 * Creates the `absences` parent row if it doesn't exist.
 */
export async function addAbsenceRecord(
    studentUniversityId: string,
    subjectId: number,
    absenceDate: string,
    isExcused: boolean,
    notes: string | undefined,
    recordedByUniversityId: string
) {
    try {
        // Resolve IDs
        const student = await db.users.findUnique({ where: { university_id: studentUniversityId } })
        if (!student) return { success: false, error: "الطالب غير موجود" }

        const recorder = await db.users.findUnique({ where: { university_id: recordedByUniversityId } })

        // Upsert the absence header
        const absence = await db.absences.upsert({
            where: { student_id_subject_id: { student_id: student.user_id, subject_id: subjectId } },
            create: { student_id: student.user_id, subject_id: subjectId, total_absences: 0, excused_count: 0 },
            update: {}
        })

        // Check for duplicate date
        const existing = await db.absence_records.findFirst({
            where: { absence_id: absence.absence_id, absence_date: new Date(absenceDate) }
        })
        if (existing) return { success: false, error: "يوجد غياب مسجل في هذا التاريخ بالفعل" }

        // Create the record
        await db.absence_records.create({
            data: {
                absence_id: absence.absence_id,
                absence_date: new Date(absenceDate),
                is_excused: isExcused,
                notes: notes || null,
                recorded_by: recorder?.user_id ?? null
            }
        })

        // Recompute counts
        const [total, excused] = await Promise.all([
            db.absence_records.count({ where: { absence_id: absence.absence_id } }),
            db.absence_records.count({ where: { absence_id: absence.absence_id, is_excused: true } })
        ])

        await db.absences.update({
            where: { absence_id: absence.absence_id },
            data: { total_absences: total, excused_count: excused }
        })

        return { success: true }
    } catch (e) {
        console.error("addAbsenceRecord error:", e)
        return { success: false, error: "فشل إضافة سجل الغياب" }
    }
}

export async function updateAbsenceRecord(
    recordId: number,
    isExcused: boolean,
    notes?: string
) {
    try {
        const record = await db.absence_records.update({
            where: { record_id: recordId },
            data: { is_excused: isExcused, notes: notes ?? null }
        })

        // Recompute
        const absence = await db.absences.findUnique({ where: { absence_id: record.absence_id } })
        if (absence) {
            const [total, excused] = await Promise.all([
                db.absence_records.count({ where: { absence_id: absence.absence_id } }),
                db.absence_records.count({ where: { absence_id: absence.absence_id, is_excused: true } })
            ])
            await db.absences.update({
                where: { absence_id: absence.absence_id },
                data: { total_absences: total, excused_count: excused }
            })
        }

        return { success: true }
    } catch (e) {
        console.error("updateAbsenceRecord error:", e)
        return { success: false, error: "فشل تحديث سجل الغياب" }
    }
}

export async function deleteAbsenceRecord(recordId: number) {
    try {
        const record = await db.absence_records.delete({ where: { record_id: recordId } })

        // Recompute
        const [total, excused] = await Promise.all([
            db.absence_records.count({ where: { absence_id: record.absence_id } }),
            db.absence_records.count({ where: { absence_id: record.absence_id, is_excused: true } })
        ])
        await db.absences.update({
            where: { absence_id: record.absence_id },
            data: { total_absences: total, excused_count: excused }
        })

        return { success: true }
    } catch (e) {
        console.error("deleteAbsenceRecord error:", e)
        return { success: false, error: "فشل حذف سجل الغياب" }
    }
}

// ============================================================
// STUDENT-FACING: get my own absences
// ============================================================

export async function getMyAbsences(studentUniversityId: string) {
    return getStudentAbsences(studentUniversityId)
}

// ============================================================
// MARK EXCUSE via approved request
// ============================================================

export async function markAbsenceExcusedByRequest(
    studentUniversityId: string,
    subjectId: number,
    absenceDates: string[], // dates to mark as excused
    requestId: number
) {
    try {
        const student = await db.users.findUnique({ where: { university_id: studentUniversityId } })
        if (!student) return { success: false, error: "الطالب غير موجود" }

        const absence = await db.absences.findUnique({
            where: { student_id_subject_id: { student_id: student.user_id, subject_id: subjectId } }
        })
        if (!absence) return { success: false, error: "لا يوجد سجل غياب لهذا الطالب في هذه المادة" }

        // Update matching records
        await db.absence_records.updateMany({
            where: {
                absence_id: absence.absence_id,
                absence_date: { in: absenceDates.map(d => new Date(d)) }
            },
            data: { is_excused: true, request_id: requestId }
        })

        // Recompute
        const [total, excused] = await Promise.all([
            db.absence_records.count({ where: { absence_id: absence.absence_id } }),
            db.absence_records.count({ where: { absence_id: absence.absence_id, is_excused: true } })
        ])
        await db.absences.update({
            where: { absence_id: absence.absence_id },
            data: { total_absences: total, excused_count: excused }
        })

        return { success: true }
    } catch (e) {
        console.error("markAbsenceExcusedByRequest error:", e)
        return { success: false, error: "فشل تحديث حالة العذر" }
    }
}

// ============================================================
// MIGRATION / ARCHIVING
// ============================================================

/**
 * Promote all students in a given level to the next level.
 * The nextLevelId must be provided by the caller.
 */
export async function promoteStudentsToNextLevel(fromLevelId: number, toLevelId: number) {
    try {
        const result = await db.users.updateMany({
            where: {
                level_id: fromLevelId,
                roles: { role_name: 'student' },
                user_status: 'active'
            },
            data: { level_id: toLevelId }
        })
        return { success: true, count: result.count }
    } catch (e) {
        console.error("promoteStudents error:", e)
        return { success: false, error: "فشل ترقية الطلاب" }
    }
}

/**
 * Bulk-promote ALL students in a department upward by one level at once.
 * Processes from the highest level downward to avoid students being counted twice.
 * The last level students are skipped (they should be graduated separately).
 */
export async function promoteAllLevelsInDepartment(departmentId: number) {
    try {
        // Fetch all levels in this department ordered ascending
        const levels = await db.$queryRaw<{ level_id: number; order: number }[]>`
            SELECT level_id, "order"
            FROM levels
            WHERE department_id = ${departmentId}
            ORDER BY "order" ASC
        `

        if (levels.length < 2) {
            return { success: false, error: "يجب أن يكون هناك مستويان على الأقل لإجراء الترقية الجماعية" }
        }

        let totalMoved = 0

        // Process from second-to-last going up → prevents double-counting
        // e.g. levels = [L1, L2, L3, L4]
        // Move L3→L4, then L2→L3, then L1→L2  (skip last level)
        for (let i = levels.length - 2; i >= 0; i--) {
            const fromLevel = levels[i]
            const toLevel = levels[i + 1]
            const result = await db.$executeRaw`
                UPDATE users
                SET level_id = ${toLevel.level_id}, current_term_id = NULL
                WHERE level_id = ${fromLevel.level_id}
                  AND user_status = 'active'
            `
            totalMoved += result as number
        }

        return { success: true, count: totalMoved }
    } catch (e) {
        console.error("promoteAllLevels error:", e)
        return { success: false, error: "فشل الترقية الجماعية" }
    }
}

/**
 * GLOBAL bulk promotion — promotes ALL active students across ALL departments
 * in a single pass. Processes levels from highest order to lowest to prevent
 * double-counting. Students in the last level of each dept are left alone.
 */
export async function promoteAllStudentsGlobally() {
    try {
        // Get all levels ordered by department + order descending
        // so we process highest levels first (prevents double-promote)
        const levels = await db.$queryRaw<{ level_id: number; department_id: number; order: number }[]>`
            SELECT level_id, department_id, "order"
            FROM levels
            WHERE department_id IS NOT NULL
            ORDER BY department_id ASC, "order" ASC
        `

        // Group by department
        const byDept = new Map<number, typeof levels>()
        for (const l of levels) {
            if (!byDept.has(l.department_id)) byDept.set(l.department_id, [])
            byDept.get(l.department_id)!.push(l)
        }

        let totalMoved = 0

        // For each dept, promote from second-to-last downto first
        for (const [, deptLevels] of byDept) {
            if (deptLevels.length < 2) continue
            for (let i = deptLevels.length - 2; i >= 0; i--) {
                const fromLevel = deptLevels[i]
                const toLevel   = deptLevels[i + 1]
                const result = await db.$executeRaw`
                    UPDATE users
                    SET level_id = ${toLevel.level_id}, current_term_id = NULL
                    WHERE level_id    = ${fromLevel.level_id}
                      AND user_status = 'active'
                `
                totalMoved += result as number
            }
        }

        return { success: true, count: totalMoved }
    } catch (e) {
        console.error("promoteAllStudentsGlobally error:", e)
        return { success: false, error: "فشل الترقية الشاملة" }
    }
}

/**
 * Move all active students currently in fromTermId to toTermId.
 * Updates current_term_id on the users table.
 */
export async function promoteStudentsToNextTerm(fromTermId: number, toTermId: number) {
    try {
        const result = await db.$executeRaw`
            UPDATE users
            SET current_term_id = ${toTermId}
            WHERE current_term_id = ${fromTermId}
              AND user_status = 'active'
        `
        return { success: true, count: result }
    } catch (e) {
        console.error("promoteStudentsToNextTerm error:", e)
        return { success: false, error: "فشل نقل الطلاب للفصل التالي" }
    }
}

/**
 * Set ALL active students in a level to start at a specific term.
 * Useful for initial setup or bulk reset.
 */
export async function assignStudentsToTerm(levelId: number, termId: number) {
    try {
        const result = await db.$executeRaw`
            UPDATE users
            SET current_term_id = ${termId}
            WHERE level_id = ${levelId}
              AND user_status = 'active'
        `
        return { success: true, count: result }
    } catch (e) {
        console.error("assignStudentsToTerm error:", e)
        return { success: false, error: "فشل تعيين الفصل الدراسي للطلاب" }
    }
}

/**
 * Graduate (archive) all active students in the specified level.
 */
export async function graduateStudents(levelId: number, academicYear: string) {
    try {
        const result = await db.users.updateMany({
            where: {
                level_id: levelId,
                roles: { role_name: 'student' },
                user_status: 'active'
            },
            data: { user_status: 'graduated', academic_year: academicYear, is_active: false }
        })
        return { success: true, count: result.count }
    } catch (e) {
        console.error("graduateStudents error:", e)
        return { success: false, error: "فشل تخريج الطلاب" }
    }
}

/**
 * Returns students for employee search (active only by default)
 */
export async function searchStudents(query: string, employeeId?: string) {
    try {
        // If we have an employeeId, get their college to filter students
        let collegeFilter: number | null = null
        if (employeeId) {
            const empRows = await db.$queryRaw<any[]>`
                SELECT d.college_id
                FROM users u
                LEFT JOIN departments d ON d.department_id = u.department_id
                WHERE u.university_id = ${employeeId}
                LIMIT 1
            `
            if (empRows.length > 0 && empRows[0].college_id) {
                collegeFilter = empRows[0].college_id
            }
        }

        // Build the student query with optional college filter via raw SQL for flexibility
        let students: any[]
        if (collegeFilter !== null) {
            students = await db.$queryRaw<any[]>`
                SELECT u.user_id, u.full_name, u.university_id, u.level_id, u.department_id,
                       u.phone, u.email,
                       d.dept_name, c.college_id, c.name AS college_name
                FROM users u
                LEFT JOIN roles r ON r.role_id = u.role_id
                LEFT JOIN departments d ON d.department_id = u.department_id
                LEFT JOIN colleges c ON c.college_id = d.college_id
                WHERE r.role_name = 'student'
                  AND u.is_active = true
                  AND u.user_status = 'active'
                  AND c.college_id = ${collegeFilter}
                  AND (
                    u.full_name ILIKE ('%' || ${query} || '%')
                    OR u.university_id ILIKE ('%' || ${query} || '%')
                  )
                ORDER BY u.full_name ASC
                LIMIT 20
            `
        } else {
            students = await db.$queryRaw<any[]>`
                SELECT u.user_id, u.full_name, u.university_id, u.level_id, u.department_id,
                       u.phone, u.email,
                       d.dept_name, c.college_id, c.name AS college_name
                FROM users u
                LEFT JOIN roles r ON r.role_id = u.role_id
                LEFT JOIN departments d ON d.department_id = u.department_id
                LEFT JOIN colleges c ON c.college_id = d.college_id
                WHERE r.role_name = 'student'
                  AND u.is_active = true
                  AND u.user_status = 'active'
                  AND (
                    u.full_name ILIKE ('%' || ${query} || '%')
                    OR u.university_id ILIKE ('%' || ${query} || '%')
                  )
                ORDER BY u.full_name ASC
                LIMIT 20
            `
        }

        if (students.length === 0) return { success: true, data: [] }

        // Fetch level info via raw SQL for all matched students' levels
        const levelIds = [...new Set(students.map((s: any) => s.level_id).filter(Boolean))] as number[]

        let levelMap: Record<number, any> = {}
        if (levelIds.length > 0) {
            const levelRows = await db.$queryRaw<any[]>`
                SELECT l.level_id, l.name AS level_name,
                       d.department_id, d.dept_name,
                       c.college_id, c.name AS college_name
                FROM levels l
                LEFT JOIN departments d ON d.department_id = l.department_id
                LEFT JOIN colleges c ON c.college_id = d.college_id
                WHERE l.level_id = ANY(${levelIds})
            `
            for (const r of levelRows) {
                levelMap[r.level_id] = {
                    level_id: r.level_id,
                    name: r.level_name,
                    departments: r.department_id ? {
                        department_id: r.department_id,
                        dept_name: r.dept_name,
                        colleges: r.college_id ? { college_id: r.college_id, name: r.college_name } : null
                    } : null
                }
            }
        }

        const data = students.map((s: any) => ({
            ...s,
            departments_users_department_idTodepartments: s.dept_name ? {
                department_id: s.department_id,
                dept_name: s.dept_name,
                colleges: s.college_id ? { college_id: s.college_id, name: s.college_name } : null
            } : null,
            levels: s.level_id ? (levelMap[s.level_id] ?? null) : null
        }))

        return { success: true, data }
    } catch (e) {
        console.error("searchStudents error:", e)
        return { success: false, error: "فشل البحث عن الطلاب" }
    }
}

/**
 * Assign a student to a level
 */
export async function assignStudentLevel(studentUniversityId: string, levelId: number | null) {
    try {
        await db.users.update({
            where: { university_id: studentUniversityId },
            data: { level_id: levelId }
        })
        return { success: true }
    } catch (e) {
        console.error("assignStudentLevel error:", e)
        return { success: false, error: "فشل تعيين المستوى" }
    }
}
