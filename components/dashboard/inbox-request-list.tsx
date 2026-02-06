
import React from "react"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { Request } from "@/types/schema"

interface InboxRequestListProps {
    requests: Request[]
    selectedRequestId?: string | null
    onSelectRequest: (request: Request) => void
    onViewHistory?: (applicantName: string) => void
}

export function InboxRequestList({ requests, selectedRequestId, onSelectRequest, onViewHistory }: InboxRequestListProps) {
    const getStatusBadge = (status: string) => {
        const statusMap: Record<string, { label: string; className: string }> = {
            pending: { label: "قيد الانتظار", className: "bg-yellow-100 text-yellow-800" },
            processing: { label: "قيد المراجعة", className: "bg-blue-100 text-blue-800" },
            approved: { label: "موافق عليه", className: "bg-green-100 text-green-800" },
            rejected: { label: "مرفوض", className: "bg-red-100 text-red-800" },
        }
        const config = statusMap[status] || statusMap.pending
        return <Badge className={config.className}>{config.label}</Badge>
    }

    return (
        <div className="w-full md:w-1/3 border border-border bg-card rounded-lg p-4 space-y-2">
            <h3 className="font-semibold mb-4">صندوق الوارد ({requests.length})</h3>
            {requests.map((req) => (
                <Card
                    key={req.id}
                    className={`cursor-pointer hover:bg-muted/50 transition-colors ${selectedRequestId === req.id ? "border-primary bg-primary/5" : ""
                        }`}
                    onClick={() => onSelectRequest(req)}
                >
                    <CardHeader className="p-4">
                        <div className="flex justify-between items-start mb-2">
                            <CardTitle className="text-base">{req.type}</CardTitle>
                            {getStatusBadge(req.status)}
                        </div>
                        <CardDescription className="text-sm">
                            <div className="flex items-center gap-1">
                                <span>مقدم من:</span>
                                {onViewHistory ? (
                                    <span
                                        className="font-medium text-foreground hover:text-primary hover:underline cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onViewHistory(req.applicant)
                                        }}
                                    >
                                        {req.applicant}
                                    </span>
                                ) : (
                                    <span>{req.applicant}</span>
                                )}
                            </div>
                        </CardDescription>
                        <p className="text-xs text-muted-foreground mt-1">{req.date}</p>
                    </CardHeader>
                </Card>
            ))}
        </div>
    )
}
