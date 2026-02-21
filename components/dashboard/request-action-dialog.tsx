"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export type ActionType = 'approve' | 'reject' | 'approve_with_changes' | 'reject_with_changes' | null

interface RequestActionDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    type: ActionType
    onConfirm: (comment: string) => void
    isProcessing: boolean
}

export function RequestActionDialog({
    open,
    onOpenChange,
    type,
    onConfirm,
    isProcessing
}: RequestActionDialogProps) {
    const [comment, setComment] = useState("")

    // Reset comment when dialog opens/closes or type changes
    useEffect(() => {
        if (open) {
            setComment("")
        }
    }, [open, type])

    const handleConfirm = () => {
        onConfirm(comment)
    }

    const getTitle = () => {
        switch (type) {
            case 'approve': return 'تأكيد الموافقة'
            case 'reject': return 'تأكيد الرفض'
            case 'approve_with_changes': return 'موافقة مع طلب تعديلات'
            case 'reject_with_changes': return 'إعادة الطلب للتعديل'
            default: return ''
        }
    }

    const getDescription = () => {
        switch (type) {
            case 'approve': return 'هل أنت متأكد من الموافقة على هذا الطلب؟'
            case 'reject': return 'الرجاء ذكر سبب الرفض (إلزامي)'
            default: return 'الرجاء ذكر التعديلات المطلوبة من الطالب (إلزامي)'
        }
    }

    const getLabel = () => {
        switch (type) {
            case 'approve': return 'ملاحظات (اختياري)'
            case 'reject': return 'سبب الرفض'
            default: return 'التعديلات المطلوبة'
        }
    }

    const getPlaceholder = () => {
        switch (type) {
            case 'approve': return "أضف ملاحظاتك..."
            case 'reject': return "اكتب سبب الرفض..."
            default: return "اشرح للطالب ما هي التعديلات المطلوبة..."
        }
    }

    const isCommentRequired = type !== 'approve'
    const isValid = !isCommentRequired || comment.trim().length > 0

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{getTitle()}</DialogTitle>
                    <DialogDescription>{getDescription()}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="dialog-comment">{getLabel()}</Label>
                        <Textarea
                            id="dialog-comment"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder={getPlaceholder()}
                            rows={5}
                            className={!isValid && comment.length > 0 ? "border-red-200 focus-visible:ring-red-500" : ""}
                        />
                        {isCommentRequired && !comment.trim() && (
                            <p className="text-xs text-red-500">* هذا الحقل مطلوب</p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isProcessing}
                    >
                        إلغاء
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isProcessing || !isValid}
                        className={
                            type === 'approve' || type === 'approve_with_changes'
                                ? "bg-green-600 hover:bg-green-700"
                                : "bg-red-600 hover:bg-red-700"
                        }
                    >
                        تأكيد
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
