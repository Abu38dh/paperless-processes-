"use client"

import { useActionState, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Eye, EyeOff } from "lucide-react"
import { authenticate } from "@/app/actions/login"

export default function LoginPage() {
  const [errorMessage, dispatch] = useActionState(authenticate, undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image src="/university-logo.png" alt="جامعة العرب" width={128} height={128} className="h-32 w-auto" priority />
          </div>
          <h1 className="text-3xl font-bold text-foreground">مسار</h1>
          <p className="text-muted-foreground text-sm mt-2">Masar System</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border border-slate-100 rounded-2xl overflow-hidden bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center py-8 pb-4">
            <CardTitle className="text-primary text-3xl font-bold tracking-tight">تسجيل الدخول</CardTitle>
            <CardDescription className="text-base mt-2">قم بتسجيل الدخول لمتابعة عملك</CardDescription>
          </CardHeader>

          <CardContent className="pt-4 pb-8 px-8">
            <form action={dispatch} className="space-y-6" onSubmit={() => setIsLoading(true)}>
              <div className="space-y-2 text-right">
                <Label htmlFor="username" className="text-foreground font-semibold">
                  اسم المستخدم أو رقم القيد
                </Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  placeholder="20123456 أو EMP001 أو admin"
                  className="border-slate-200 text-right h-12 focus-visible:ring-primary bg-slate-50/50"
                  required
                  autoComplete="off"
                  dir="rtl"
                />
              </div>

              {/* Password Input */}
              <div className="space-y-2 text-right">
                <Label htmlFor="password" className="text-foreground font-semibold">
                  كلمة المرور
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="border-slate-200 h-12 text-right focus-visible:ring-primary bg-slate-50/50 pr-3 pl-10"
                    required
                    autoComplete="off"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-1 text-right" dir="rtl">
                  <AlertCircle className="h-4 w-4 ml-2" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg rounded-xl transition-all active:scale-[0.98]"
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

