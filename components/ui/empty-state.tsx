import type React from "react"
import { Card, CardContent } from "./card"
import { Button } from "./button"

interface EmptyStateProps {
    icon?: React.ReactNode | string
    title: string
    description?: string
    action?: {
        label: string
        onClick: () => void
    }
}

/**
 * Empty state component for when no data exists
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <Card>
            <CardContent className="py-16">
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                    {/* Icon */}
                    <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-4xl">
                        {typeof icon === "string" ? icon : icon || "📭"}
                    </div>

                    {/* Title */}
                    <div>
                        <h3 className="font-semibold text-foreground text-lg mb-2">{title}</h3>
                        {description && (
                            <p className="text-sm text-muted-foreground max-w-md">{description}</p>
                        )}
                    </div>

                    {/* Action Button */}
                    {action && (
                        <Button onClick={action.onClick} className="mt-2">
                            {action.label}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
