"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, CheckCircle2, XCircle, Loader2, CalendarDays, GraduationCap } from "lucide-react"
import { getMyAbsences } from "@/app/actions/absences"

interface AbsencesViewProps {
    studentUniversityId: string
}

export default function AbsencesView({ studentUniversityId }: AbsencesViewProps) {
    const [loading, setLoading] = useState(true)
    const [studentInfo, setStudentInfo] = useState<any>(null)
    const [subjects, setSubjects] = useState<any[]>([])
    const [expanded, setExpanded] = useState<number | null>(null)

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            try {
                const res = await getMyAbsences(studentUniversityId)
                if (res.success) {
                    setStudentInfo((res as any).student)
                    setSubjects((res as any).subjects ?? [])
                }
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [studentUniversityId])

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground" dir="rtl">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جارٍ تحميل الغيابات...</span>
            </div>
        )
    }

    if (!studentInfo?.level) {
        return (
            <div className="p-6 text-center" dir="rtl">
                <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-muted-foreground font-medium">لم يتم تعيين مستوى دراسي لحسابك بعد</p>
                <p className="text-sm text-muted-foreground mt-1">يرجى التواصل مع شؤون الطلاب لتحديث بياناتك</p>
            </div>
        )
    }

    const totalAbsences = subjects.reduce((a, s) => a + s.total_absences, 0)
    const totalExcused = subjects.reduce((a, s) => a + s.excused_count, 0)
    const totalUnexcused = totalAbsences - totalExcused

    return (
        <div className="p-6 space-y-6" dir="rtl">
            <div>
                <h1 className="text-2xl font-bold text-foreground">الغيابات</h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                    سجل غياباتك الدراسية
                </p>
            </div>

            {/* Student level/dept/college info */}
            <div className="flex flex-wrap gap-2 items-center text-sm">
                <Badge variant="secondary" className="gap-1 text-sm px-3 py-1">
                    <GraduationCap className="w-3.5 h-3.5" />
                    {studentInfo.level.name}
                </Badge>
                {studentInfo.level.departments && (
                    <>
                        <span className="text-muted-foreground text-xs">•</span>
                        <span className="text-muted-foreground text-xs">
                            {studentInfo.level.departments.colleges?.name && (
                                <>{studentInfo.level.departments.colleges.name} / </>
                            )}
                            {studentInfo.level.departments.dept_name}
                        </span>
                    </>
                )}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-3">
                <Card className="text-center">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-2xl font-bold">{totalAbsences}</p>
                        <p className="text-xs text-muted-foreground mt-1">إجمالي الغيابات</p>
                    </CardContent>
                </Card>
                <Card className="text-center border-green-200">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-2xl font-bold text-green-600">{totalExcused}</p>
                        <p className="text-xs text-muted-foreground mt-1">بعذر مقبول</p>
                    </CardContent>
                </Card>
                <Card className="text-center border-red-200">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-2xl font-bold text-red-600">{totalUnexcused}</p>
                        <p className="text-xs text-muted-foreground mt-1">بدون عذر</p>
                    </CardContent>
                </Card>
            </div>

            {/* Subjects */}
            {subjects.length === 0 ? (
                <Card>
                    <CardContent className="pt-6 text-center text-muted-foreground py-12">
                        <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>لا توجد مواد مرتبطة بمستواك الدراسي حتى الآن</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {subjects.map(subject => {
                        const unexcused = subject.total_absences - subject.excused_count
                        const isExpanded = expanded === subject.subject_id

                        return (
                            <Card
                                key={subject.subject_id}
                                className={`overflow-hidden transition-all ${subject.total_absences > 0 ? 'border-l-4 border-l-primary' : ''}`}
                            >
                                {/* Header row – clickable */}
                                <button
                                    className="w-full text-right"
                                    onClick={() => setExpanded(isExpanded ? null : subject.subject_id)}
                                    disabled={subject.records.length === 0}
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                                <BookOpen className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="text-base truncate">
                                                    {subject.name}
                                                    {subject.code && (
                                                        <span className="text-xs font-normal text-muted-foreground mr-2">
                                                            ({subject.code})
                                                        </span>
                                                    )}
                                                </CardTitle>
                                                <div className="flex flex-wrap gap-2 mt-1.5">
                                                    <Badge variant="secondary" className="text-xs">
                                                        الإجمالي: {subject.total_absences}
                                                    </Badge>
                                                    <Badge className="text-xs bg-green-100 text-green-700 border-green-200">
                                                        بعذر: {subject.excused_count}
                                                    </Badge>
                                                    <Badge className="text-xs bg-red-50 text-red-600 border-red-200">
                                                        بدون عذر: {unexcused}
                                                    </Badge>
                                                </div>
                                            </div>
                                            {subject.records.length > 0 && (
                                                <span className="text-xs text-muted-foreground shrink-0">
                                                    {isExpanded ? "إخفاء التفاصيل ▲" : "عرض التفاصيل ▼"}
                                                </span>
                                            )}
                                        </div>
                                    </CardHeader>
                                </button>

                                {/* Expanded records */}
                                {isExpanded && subject.records.length > 0 && (
                                    <CardContent className="pt-0 border-t">
                                        <div className="rounded-lg border overflow-hidden mt-3">
                                            <table className="w-full text-sm">
                                                <thead className="bg-muted/40">
                                                    <tr>
                                                        <th className="text-right p-3 font-medium">التاريخ</th>
                                                        <th className="text-right p-3 font-medium">الحالة</th>
                                                        <th className="text-right p-3 font-medium">ملاحظات</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {subject.records.map((record: any) => (
                                                        <tr key={record.record_id} className="hover:bg-muted/20">
                                                            <td className="p-3 font-mono text-sm">
                                                                {new Date(record.absence_date).toLocaleDateString('ar-SA')}
                                                            </td>
                                                            <td className="p-3">
                                                                {record.is_excused ? (
                                                                    <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                                        عذر مقبول
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-1 text-red-500 text-xs font-medium">
                                                                        <XCircle className="w-3.5 h-3.5" />
                                                                        بدون عذر
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="p-3 text-xs text-muted-foreground">
                                                                {record.notes || "—"}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                )}
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
