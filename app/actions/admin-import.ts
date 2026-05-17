"use server"

import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"

export async function importUsersFromCSV(usersData: any[], currentUserId: string) {
  try {
    // 1. Basic authorization check
    const currentUser = await db.users.findUnique({
      where: { university_id: currentUserId },
      include: { roles: true }
    })
    
    if (!currentUser || !['admin', 'manager', 'dean'].includes(currentUser.roles.role_name)) {
       return { success: false, error: "غير مصرح لك بإجراء هذه العملية" }
    }

    // 2. Fetch dependencies for mapping
    const departments = await db.departments.findMany()
    const levels = await db.levels.findMany()
    const studentRole = await db.roles.findFirst({ where: { role_name: 'student' } })
    
    if (!studentRole) {
      return { success: false, error: "دور 'طالب' غير موجود في النظام" }
    }

    const formattedUsers = []
    
    for (const row of usersData) {
      const universityId = row['الرقم_الأكاديمي']?.toString()?.trim() || row['university_id']?.toString()?.trim()
      const fullName = row['اسم_الطالب_ع']?.trim() || row['full_name']?.trim()
      const idNumber = row['رقمها']?.toString()?.trim() || row['id_number']?.toString()?.trim()
      const phone = row['جوال']?.toString()?.trim() || row['phone']?.toString()?.trim()
      const email = row['بريد_الكتروني']?.toString()?.trim() || row['email']?.toString()?.trim()
      const deptNameStr = row['اسم_القسم_ع']?.trim() || row['department']?.trim()
      const levelNameStr = row['الفصل_ع']?.trim() || row['level']?.trim()
      
      // Skip if required fields are missing
      if (!universityId || !fullName || !idNumber) {
        continue
      }
      
      // 3. Match Department
      let matchedDeptId = null
      if (deptNameStr) {
        // Remove common words to improve matching (e.g. "قسم ")
        const cleanDeptName = deptNameStr.replace(/^قسم\s+/i, '').trim()
        const foundDept = departments.find((d: any) => 
          d.dept_name.includes(cleanDeptName) || cleanDeptName.includes(d.dept_name)
        )
        if (foundDept) {
          matchedDeptId = foundDept.department_id
        }
      }
      
      // 4. Match Level (within the matched department)
      let matchedLevelId = null
      if (levelNameStr && matchedDeptId) {
        const foundLevel = levels.find((l: any) => 
          l.department_id === matchedDeptId && 
          (l.name.includes(levelNameStr) || levelNameStr.includes(l.name))
        )
        if (foundLevel) {
          matchedLevelId = foundLevel.level_id
        }
      }
      
      // 5. Hash Password
      // Notice: doing this sequentially in a loop could take a few seconds for ~1000 users.
      // But it is safer to avoid memory/CPU spikes compared to Promise.all for thousands of bcrypt calls.
      const hashedPassword = await bcrypt.hash(idNumber, 10)
      
      formattedUsers.push({
        university_id: universityId,
        full_name: fullName,
        password_hash: hashedPassword,
        phone: phone || null,
        email: email || null,
        role_id: studentRole.role_id,
        department_id: matchedDeptId,
        level_id: matchedLevelId,
        is_active: true
      })
    }
    
    if (formattedUsers.length === 0) {
      return { success: false, error: "لم يتم العثور على بيانات طلاب صالحة أو ينقصها أعمدة أساسية (الرقم الأكاديمي، الاسم، الهوية)" }
    }
    
    // 6. Batch Insert
    const result = await db.users.createMany({
      data: formattedUsers,
      skipDuplicates: true
    })
    
    revalidatePath('/admin/users')
    
    return { 
      success: true, 
      count: result.count,
      totalProcessed: formattedUsers.length 
    }
    
  } catch (error: any) {
    console.error("CSV Import Error:", error)
    return { success: false, error: error.message || "حدث خطأ داخلي أثناء استيراد البيانات" }
  }
}
