
export const roleTranslations: Record<string, string> = {
    admin: "مسؤول النظام",
    dean: "عميد",
    head: "رئيس قسم",
    head_of_department: "رئيس قسم",
    manager: "مدير",
    employee: "موظف",
    student: "طالب",
    vice_dean: "وكيل كلية",
    security: "أمن",
    // Add other roles as needed
}

export function translateRole(roleName: string | undefined | null): string {
    if (!roleName) return "-"
    const lowerRole = roleName.toLowerCase()
    return roleTranslations[lowerRole] || roleName
}
