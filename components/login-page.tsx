"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface LoginPageProps {
  onLogin: (userRole: "student" | "employee" | "admin", permissions?: string[]) => void
}

import { loginUser } from "@/app/actions/auth"

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const result = await loginUser(username, password)

      if (result.success && result.user) {
        // Store user data in sessionStorage
        const userData = {
          university_id: result.user.university_id,
          full_name: result.user.full_name,
          role: result.user.role,
          permissions: result.user.permissions || [],
          department_id: result.user.department_id
        }

        sessionStorage.setItem("current_user", JSON.stringify(userData))

        onLogin(result.user.role, result.user.permissions)
      } else {
        setError(result.error || "فشل تسجيل الدخول")
      }
    } catch {
      setError("حدث خطأ غير متوقع")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src="/university-logo.png" alt="جامعة العرب" className="h-32" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">نظام المراسلات</h1>
          <p className="text-muted-foreground text-sm mt-2">Correspondence System</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg border-0">
          <CardHeader className="bg-primary/5 border-b border-slate-200 text-center py-6">
            <CardTitle className="text-primary text-2xl">تسجيل الدخول</CardTitle>
            <CardDescription>قم بتسجيل الدخول لمتابعة عملك</CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-foreground">
                  اسم المستخدم أو رقم القيد
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="20123456 أو EMP001 أو admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="border-slate-200 text-right"
                  disabled={isLoading}
                  autoComplete="off"
                />
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground">
                  كلمة المرور
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-slate-200"
                  disabled={isLoading}
                  autoComplete="off"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                disabled={isLoading}
              >
                {isLoading ? "جاري الدخول..." : "دخول"}
              </Button>


            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-muted-foreground">
          <p>© 2025 Al-Arab University. جامعة العرب</p>
        </div>
      </div>
    </div>
  )
}
