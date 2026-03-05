import React from "react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface RequestStatsProps {
  stats: {
    returned: number
    approved: number
    rejected: number
    pending: number
  }
  onStatClick?: (type: 'pending' | 'approved' | 'rejected' | 'returned') => void
}

export function RequestStats({ stats, onStatClick }: RequestStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card 
        className="cursor-pointer hover:shadow-md hover:-translate-y-1 hover:border-yellow-200 transition-all duration-200"
        onClick={() => onStatClick?.('pending')}
      >
        <CardHeader className="pb-2">
          <CardDescription>قيد الانتظار</CardDescription>
          <CardTitle className="text-3xl text-yellow-600">{stats.pending}</CardTitle>
        </CardHeader>
      </Card>
      <Card 
        className="cursor-pointer hover:shadow-md hover:-translate-y-1 hover:border-green-200 transition-all duration-200"
        onClick={() => onStatClick?.('approved')}
      >
        <CardHeader className="pb-2">
          <CardDescription>تم الموافقة</CardDescription>
          <CardTitle className="text-3xl text-green-600">{stats.approved}</CardTitle>
        </CardHeader>
      </Card>
      <Card 
        className="cursor-pointer hover:shadow-md hover:-translate-y-1 hover:border-red-200 transition-all duration-200"
        onClick={() => onStatClick?.('rejected')}
      >
        <CardHeader className="pb-2">
          <CardDescription>تم الرفض</CardDescription>
          <CardTitle className="text-3xl text-red-600">{stats.rejected}</CardTitle>
        </CardHeader>
      </Card>
      <Card 
        className="cursor-pointer hover:shadow-md hover:-translate-y-1 hover:border-orange-200 transition-all duration-200"
        onClick={() => onStatClick?.('returned')}
      >
        <CardHeader className="pb-2">
          <CardDescription>معاد للتعديل</CardDescription>
          <CardTitle className="text-3xl text-orange-600">{stats.returned}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  )
}
