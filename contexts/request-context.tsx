"use client"

import React, { createContext, useContext, useState, ReactNode } from "react"

import { Comment, Attachment, ApprovalLog, FormResponse } from "@/types/schema"

export type RequestStatus = "pending" | "approved" | "approved_with_changes" | "rejected_with_changes" | "rejected" | "processing"

export interface Request {
    id: string
    requestNumber: string
    title: string
    type: string
    submittedBy: string
    date: string
    status: RequestStatus
    description: string
    previousStage?: string
    waitingTime?: string
    rejectedBy?: string
    workflow?: { step: number; department: string; role: string; status: RequestStatus }[]
    // New fields from ERD
    comments?: Comment[]
    attachments?: Attachment[]
    approvalLogs?: ApprovalLog[]
    formResponses?: FormResponse[]
}

interface RequestContextType {
    requests: Request[]
    addRequest: (request: Omit<Request, "id" | "requestNumber" | "date" | "status">) => void
    updateRequestStatus: (id: string, status: RequestStatus, notes?: string) => void
}

const RequestContext = createContext<RequestContextType | undefined>(undefined)

export const useRequests = () => {
    const context = useContext(RequestContext)
    if (!context) {
        throw new Error("useRequests must be used within a RequestProvider")
    }
    return context
}

const initialRequests: Request[] = [
    {
        id: "1",
        requestNumber: "REQ-001",
        title: "طلب إجازة",
        type: "Leave Request",
        submittedBy: "أحمد محمد",
        date: "2025-01-15",
        status: "pending",
        description: "إجازة سنوية",
        previousStage: "مدير القسم",
        waitingTime: "يومين",
    },
    {
        id: "2",
        requestNumber: "REQ-002",
        title: "طلب معدات",
        type: "Equipment Request",
        submittedBy: "فاطمة الزهراء",
        date: "2025-01-10",
        status: "approved",
        description: "طلب كمبيوتر محمول",
        previousStage: "المحاسبة",
        waitingTime: "3 أيام",
    },
    {
        id: "3",
        requestNumber: "REQ-003",
        title: "طلب صيانة",
        type: "Maintenance Request",
        submittedBy: "علياء خالد",
        date: "2025-01-08",
        status: "rejected",
        description: "صيانة المكتب",
        previousStage: "شؤون الموظفين",
        waitingTime: "ساعة",
    },
]

export const RequestProvider = ({ children }: { children: ReactNode }) => {
    const [requests, setRequests] = useState<Request[]>(initialRequests)

    const addRequest = (newRequestData: Omit<Request, "id" | "requestNumber" | "date" | "status">) => {
        const newRequest: Request = {
            ...newRequestData,
            id: Date.now().toString(),
            requestNumber: `REQ-${String(requests.length + 1).padStart(3, "0")}`,
            date: new Date().toISOString().split("T")[0],
            status: "pending",
        }
        setRequests([newRequest, ...requests])
    }

    const updateRequestStatus = (id: string, status: RequestStatus, notes?: string) => {
        setRequests(
            requests.map((req) =>
                req.id === id ? { ...req, status, rejectedBy: status.includes("rejected") ? "المراجع" : undefined } : req
            )
        )
    }

    return (
        <RequestContext.Provider value={{ requests, addRequest, updateRequestStatus }}>
            {children}
        </RequestContext.Provider>
    )
}
