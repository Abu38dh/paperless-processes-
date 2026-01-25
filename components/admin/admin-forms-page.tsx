"use client"

import { useState } from "react"
import FormTemplatesList from "@/components/admin/form-templates-list"
import FormBuilderEditor from "@/components/admin/form-builder-editor"

interface AdminFormsPageProps {
  onBack: () => void
}

export default function AdminFormsPage({ onBack }: AdminFormsPageProps) {
  const [view, setView] = useState<"list" | "editor">("list")
  const [editingFormId, setEditingFormId] = useState<string | null>(null)

  const handleEditForm = (id: string) => {
    setEditingFormId(id)
    setView("editor")
  }

  const handleCreateNewForm = () => {
    setEditingFormId("new")
    setView("editor")
  }

  const handleBackToList = () => {
    setView("list")
    setEditingFormId(null)
  }

  return view === "list" ? (
    <FormTemplatesList onEditForm={handleEditForm} onCreateNewForm={handleCreateNewForm} onBack={onBack} />
  ) : (
    <FormBuilderEditor formId={editingFormId!} onBack={handleBackToList} />
  )
}
