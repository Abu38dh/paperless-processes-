"use client"

import { Card } from "@/components/ui/card"
import { CheckCircle, Clock, XCircle } from "lucide-react"

interface WorkflowStep {
  step: number
  department: string
  role: string
  status: "pending" | "approved" | "rejected" | "processing"
}

interface RequestTrackingProps {
  workflow: WorkflowStep[]
}

export default function RequestTracking({ workflow }: RequestTrackingProps) {
  const currentStepIndex = workflow.findIndex((step) => step.status === "processing" || step.status === "pending")

  let completedSteps: WorkflowStep[] = []
  let currentStep: WorkflowStep | undefined
  let upcomingSteps: WorkflowStep[] = []

  if (currentStepIndex === -1) {
    // Check if all are approved
    const allApproved = workflow.every((s) => s.status === "approved")
    if (allApproved) {
      completedSteps = workflow
      upcomingSteps = []
    } else {
      // Check if any is rejected
      const rejectedIndex = workflow.findIndex((s) => s.status === "rejected")
      if (rejectedIndex !== -1) {
        completedSteps = workflow.slice(0, rejectedIndex + 1)
        upcomingSteps = []
      } else {
        // Fallback for other cases (e.g. all pending but findIndex failed? shouldn't happen if status is typed correctly)
        completedSteps = workflow
      }
    }
  } else {
    completedSteps = workflow.slice(0, currentStepIndex)
    currentStep = workflow[currentStepIndex]
    upcomingSteps = workflow.slice(currentStepIndex + 1)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap overflow-x-auto pb-2">
        {workflow.map((step, index) => {
          // Determine style based on status
          let badgeClass = "bg-white border-gray-200 text-gray-500"

          if (step.status === "approved") {
            badgeClass = "bg-teal-50 border-teal-200 text-teal-700 font-medium"
          } else if (step.status === "processing") {
            badgeClass = "bg-blue-50 border-blue-200 text-blue-700 font-medium ring-2 ring-blue-100"
          } else if (step.status === "rejected") {
            badgeClass = "bg-red-50 border-red-200 text-red-700"
          }

          return (
            <div key={step.step} className="flex items-center">
              <div className={`flex items-center px-4 py-1.5 rounded-full border text-sm transition-colors whitespace-nowrap ${badgeClass}`}>
                {step.status === "approved" && <CheckCircle className="w-3.5 h-3.5 ml-2" />}
                {step.status === "processing" && <Clock className="w-3.5 h-3.5 ml-2 animate-pulse" />}
                {step.status === "rejected" && <XCircle className="w-3.5 h-3.5 ml-2" />}
                {step.department}
              </div>

              {index < workflow.length - 1 && (
                <div className="mx-2 text-gray-300">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rotate-180">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Current Step Detailed Card */}
      {currentStep ? (
        <Card className="p-4 border border-blue-100 bg-blue-50/30">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 rounded-full text-blue-600 mt-1">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">الطلب حالياً عند:</p>
              <h4 className="text-lg font-bold text-gray-900">{currentStep.department}</h4>
              <p className="text-sm text-gray-500 mt-1">{currentStep.role}</p>
            </div>
          </div>
        </Card>
      ) : (
        // Check for rejected state to show appropriate card
        workflow.some(s => s.status === 'rejected') && (
          <Card className="p-4 border border-red-100 bg-red-50/30">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-red-100 rounded-full text-red-600 mt-1">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-900 mb-1">تم رفض الطلب من قبل:</p>
                <h4 className="text-lg font-bold text-gray-900">
                  {workflow.find(s => s.status === 'rejected')?.department}
                </h4>
                <p className="text-sm text-gray-500 mt-1">
                  {workflow.find(s => s.status === 'rejected')?.role}
                </p>
              </div>
            </div>
          </Card>
        )
      )}
    </div>
  )
}
