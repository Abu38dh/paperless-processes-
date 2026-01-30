"use client"

import { useActionState, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { authenticate } from "@/app/actions/login"

export default function LoginPage() {
  const [errorMessage, dispatch] = useActionState(authenticate, undefined)
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image src="/university-logo.png" alt="جامعة العرب" width={128} height={128} className="h-32 w-auto" priority />
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
            <form action={dispatch} className="space-y-4" onSubmit={() => setIsLoading(true)}>
              <div className="space-y-2">
                <Label htmlFor="username" className="text-foreground">
                  اسم المستخدم أو رقم القيد
                </Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="20123456 أو EMP001 أو admin"
                  className="border-slate-200 text-right"
                  required
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
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  className="border-slate-200"
                  required
                  autoComplete="off"
                />
              </div>

              {errorMessage && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                aria-disabled={isLoading}
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
