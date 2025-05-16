import type { ReactNode } from "react"
import { PackageX } from "lucide-react"

interface NoDataMessageProps {
    title: string
    description: string
    action?: ReactNode
}

export default function NoDataMessage({ title, description, action }: NoDataMessageProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="bg-slate-800/50 p-4 rounded-full mb-4">
                <PackageX className="h-10 w-10 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
            <p className="text-slate-400 max-w-md mb-4">{description}</p>
            {action}
        </div>
    )
}
