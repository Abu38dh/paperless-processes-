"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ListSkeleton } from "@/components/ui/loading-skeleton"
import { useState } from "react"

interface Request {
  id: string
  title: string
  type: string
  date: string
  status: string
  description?: string
  reference_no?: string
}

interface RequestListProps {
  requests: Request[]
  selectedId?: string
  onSelect: (id: string) => void
  loading?: boolean
}

export default function RequestList({ requests, selectedId, onSelect, loading }: RequestListProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredRequests = requests.filter(req =>
    req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    req.id.includes(searchTerm)
  )

  const statusColors: Record<string, string> = {
    pending: "bg-secondary/10 text-secondary",
    approved: "bg-primary/10 text-primary",
    rejected: "bg-red-100 text-red-800",
    processing: "bg-blue-100 text-blue-800",
    approved_with_changes: "bg-primary/10 text-primary",
    rejected_with_changes: "bg-secondary/10 text-secondary",
  }

  const statusLabels: Record<string, string> = {
    pending: "قيد الانتظار",
    approved: "موافق عليه",
    rejected: "مرفوض",
    processing: "قيد المراجعة",
    approved_with_changes: "موافق بتعديلات",
    rejected_with_changes: "معاد للتعديل",
  }

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-lg font-semibold text-foreground mb-4">الطلبات</h3>
      <div className="relative mb-4">
        <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="بحث..."
          className="pr-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {filteredRequests.map((request) => (
        <Card
          key={request.id}
          onClick={() => onSelect(request.id)}
          className={`p-4 cursor-pointer transition-all border ${selectedId === request.id
            ? "border-primary bg-primary/5 shadow-md"
            : "border-slate-200 hover:border-primary/50"
            }`}
        >
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold text-foreground">{request.title}</h4>
            <span className={`text-xs px-2 py-1 rounded ${statusColors[request.status]}`}>
              {statusLabels[request.status]}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mb-2">{request.type}</p>
          <p className="text-xs text-muted-foreground">{request.date}</p>
        </Card>
      ))}
    </div>
  )
}
