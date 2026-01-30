import React from "react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface RequestStatsProps {
  stats: {
    totalActions: number
    approved: number
    rejected: number
    pending: number
  }
}

export function RequestStats({ stats }: RequestStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>قيد الانتظار</CardDescription>
          <CardTitle className="text-3xl text-yellow-600">{stats.pending}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>تم الموافقة</CardDescription>
          <CardTitle className="text-3xl text-green-600">{stats.approved}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>تم الرفض</CardDescription>
          <CardTitle className="text-3xl text-red-600">{stats.rejected}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>إجمالي الإجراءات</CardDescription>
          <CardTitle className="text-3xl">{stats.totalActions}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  )
}
