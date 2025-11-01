'use client'

import { Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ModelBadgeProps {
  model?: string
  className?: string
}

export function ModelBadge({ model, className }: ModelBadgeProps) {
  if (!model) return null

  const getModelDisplay = (model: string) => {
    if (model.startsWith('ollama/')) {
      return model.replace('ollama/', '')
    }
    if (model.startsWith('google/')) {
      return model.replace('google/', '')
    }
    return model
  }

  const getModelColor = (model: string) => {
    if (model.startsWith('ollama/')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 transition-colors'
    }
    if (model.startsWith('google/')) {
      return 'bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/20 transition-colors'
    }
    return 'bg-muted text-muted-foreground border-border hover:bg-muted/80 transition-colors'
  }

  return (
    <div
    className={cn(
      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
      getModelColor(model),
      className
    )}
  >
    <Bot className="h-3 w-3 shrink-0" />
    <span className="text-xs overflow-hidden text-ellipsis whitespace-nowrap">{getModelDisplay(model)}</span>
  </div>
  )
}

