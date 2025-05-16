import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Trophy, Coins } from "lucide-react"

interface UserBalanceProps {
    xpBalance: number
    lootBalance: number
}

export default function UserBalance({ xpBalance, lootBalance }: UserBalanceProps) {
    return (
        <div className="flex flex-col sm:flex-row gap-2">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge
                            variant="outline"
                            className="px-3 py-1 bg-slate-800/50 border-slate-700 flex items-center gap-1"
                        >
                            <Trophy className="h-4 w-4 text-yellow-500" />
                            <span className="font-medium">{xpBalance.toLocaleString()} XP</span>
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="text-sm">Your experience points</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Badge
                            variant="outline"
                            className="px-3 py-1 bg-slate-800/50 border-slate-700 flex items-center gap-1"
                        >
                            <Coins className="h-4 w-4 text-cyan-500" />
                            <span className="font-medium">{lootBalance.toLocaleString()} LOOT</span>
                        </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="text-sm">Your LOOT token balance</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    )
}
