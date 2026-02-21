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
  const role = user.role?.toLowerCase()

  // Prepare userData object compatible with existing components
  const userData = {
    university_id: user.university_id,
    full_name: user.name || "",
    role: user.role,
    permissions: user.permissions || [],
    department_id: user.department_id,
  }

  switch (true) {
    case role === "student":
      return <StudentDashboard userData={userData as any} onLogout={logout} />

    case role === "employee":
    case role === "dean":
    case role === "head_of_department":
    case role === "manager":
    case role === "vice_dean":
      return <EmployeeDashboard permissions={userData.permissions} userData={userData as any} onLogout={logout} />

    case role === "admin":
      return <AdminDashboard userData={userData as any} onLogout={logout} />

    default:
      if (userData.permissions && userData.permissions.length > 0) {
        return <EmployeeDashboard permissions={userData.permissions} userData={userData as any} onLogout={logout} />
      }
      return <StudentDashboard userData={userData as any} onLogout={logout} />
  }
}

