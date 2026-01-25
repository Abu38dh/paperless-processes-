"use client"

import { useState, useEffect } from "react"
import LoginPage from "@/components/login-page"
import StudentDashboard from "@/components/student-dashboard"
import EmployeeDashboard from "@/components/employee-dashboard"
import AdminDashboard from "@/components/admin-dashboard"

type UserRole = "student" | "employee" | "admin" | "dean" | "head_of_department" | "manager" | "vice_dean"

interface UserData {
  university_id: string
  full_name: string
  role: UserRole
  permissions: string[]
  department_id?: number | null
}

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for stored user session on mount
  useEffect(() => {
    const storedUser = sessionStorage.getItem("current_user")
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        console.log('✅ جلسة محفوظة:', user)
        setUserData(user)
        setIsLoggedIn(true)
      } catch (e) {
        console.error("Failed to parse stored user:", e)
        sessionStorage.removeItem("current_user")
      }
    }
    setIsLoading(false)
  }, [])

  const handleLogin = (role: UserRole, permissions: string[] = []) => {
    // Get user data from sessionStorage (already stored by SimpleLogin/LoginPage)
    const storedUser = sessionStorage.getItem("current_user")
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        console.log('✅ تسجيل دخول ناجح:', user)
        setUserData(user)
        setIsLoggedIn(true)
      } catch (e) {
        console.error("Error reading user data:", e)
      }
    }
  }

  const handleLogout = () => {
    console.log('🚪 تسجيل الخروج')
    setIsLoggedIn(false)
    setUserData(null)
    sessionStorage.removeItem("current_user")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  if (!isLoggedIn || !userData) {
    return <LoginPage onLogin={handleLogin} />
  }

  console.log('📊 Dashboard Render:', { role: userData.role, userData })

  // Normalize role for switch check (handle case variations)
  const role = userData.role.toLowerCase()

  switch (true) {
    case role === "student":
      return <StudentDashboard onLogout={handleLogout} userData={userData} />

    // Administrative / Academic Staff Roles -> Employee Dashboard
    case role === "employee":
    case role === "dean":
    case role === "head_of_department":
    case role === "manager":
    case role === "vice_dean":
      return <EmployeeDashboard onLogout={handleLogout} permissions={userData.permissions} userData={userData} />

    case role === "admin":
      return <AdminDashboard onLogout={handleLogout} userData={userData} />

    default:
      // Fallback: If has permissions, likely an employee-type user
      if (userData.permissions && userData.permissions.length > 0) {
        return <EmployeeDashboard onLogout={handleLogout} permissions={userData.permissions} userData={userData} />
      }
      return <StudentDashboard onLogout={handleLogout} userData={userData} />
  }
}
