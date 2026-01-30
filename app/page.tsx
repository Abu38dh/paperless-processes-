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

  const user = session.user
  const role = user.role?.toLowerCase()

  // Prepare userData object compatible with existing components
  const userData = {
    university_id: user.university_id,
    full_name: user.name || "",
    role: user.role,
    permissions: user.permissions || [],
    department_id: user.department_id,
    // Add any other fields required by UserData interface
  }

  // Helper to handle logout (passed as prop)
  // Since this is a server component, we can't pass a function that calls server action directly as an event handler to client component
  // effectively easily without a client wrapper or passing a server action.
  // Existing dashboards expect `onLogout`.
  // We can pass a dummy function or update dashboards to handle logout themselves via a separate component.
  // For now, let's create a server action for logout or simple client wrapper.
  // Better approach: Update dashboards to use a real SignOut button component instead of a callback.
  // For compatibility, we'll pass an empty function and handle logout inside the dashboards if possible,
  // OR we pass a server action that can be called.

  // Actually, existing components call `onLogout` which just clears local state.
  // With NextAuth, we need to call `signOut()`.
  // I should provide a client-side wrapper or modify dashboards.
  // Let's assume for this step we will handle the logout inside the dashboards or just pass a no-op for now and fix logout button next.

  /*
    NOTE: The existing dashboards take `onLogout`. 
    I will modify them to accept a `signOutAction` or simply ignore `onLogout` and use a global SignOut button.
    For this transition, I'll pass a no-op and we will fix the logout button in a separate step (or inside the dashboards).
  */

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

