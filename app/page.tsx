import { auth } from "@/auth"
import LoginPage from "@/components/login-page"
import StudentDashboard from "@/components/student-dashboard"
import EmployeeDashboard from "@/components/employee-dashboard"
import AdminDashboard from "@/components/admin-dashboard"
import { logout } from "@/app/actions/login"

export default async function Home() {
  const session = await auth()

  if (!session || !session.user) {
    return <LoginPage />
  }

  const { user } = session
  const role = user.role?.toLowerCase() || ""

  // Prepare userData object strictly compatible with dashboard prop types
  const dashboardUserData = {
    university_id: user.university_id || "",
    full_name: user.name || "",
    role: user.role || "",
  }

  switch (true) {
    case role === "student":
      return <StudentDashboard userData={dashboardUserData} onLogout={logout} />

    case role === "employee":
    case role === "dean":
    case role === "head_of_department":
    case role === "manager":
    case role === "vice_dean":
      return <EmployeeDashboard permissions={user.permissions || []} userData={dashboardUserData} onLogout={logout} />

    case role === "admin":
      return <AdminDashboard userData={dashboardUserData} onLogout={logout} />

    default:
      if (user.permissions && user.permissions.length > 0) {
        return <EmployeeDashboard permissions={user.permissions} userData={dashboardUserData} onLogout={logout} />
      }
      return (
        <div className="min-h-screen flex items-center justify-center bg-background flex-col gap-4" dir="rtl">
          <div className="text-xl text-destructive font-bold">عذراً، هذا الحساب ليس لديه صلاحيات للدخول أو دوره غير معروف.</div>
          <form action={logout}>
            <button type="submit" className="px-6 py-2 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors">
              العودة وتسجيل الخروج
            </button>
          </form>
        </div>
      )
  }
}


