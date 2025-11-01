'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useStore } from '@/lib/store'
import { Model } from '@/lib/models'
import { cn } from '@/lib/utils'

export function ModelSelector() {
  const [open, setOpen] = React.useState(false)
  const [models, setModels] = React.useState<Model[]>([])
  const [searchQuery, setSearchQuery] = React.useState('')
  const { selectedModel, setSelectedModel, settings } = useStore()

  React.useEffect(() => {
    const fetchModels = async () => {
      try {
        const params = new URLSearchParams()
        
        // Add Ollama host if available
        if (settings.ollamaHost) {
          params.append('ollamaHost', settings.ollamaHost)
        }
        
        // Add Google API key if available
        if (settings.googleApiKey) {
          params.append('googleApiKey', settings.googleApiKey)
        }
        
        const response = await fetch(`/api/models?${params.toString()}`)
        const data = await response.json()
        setModels(data.models || [])
        
        // Auto-select first model if none selected
        if (!selectedModel && data.models?.length > 0) {
          setSelectedModel(data.models[0].id)
        }
      } catch (error) {
        console.error('Error fetching models:', error)
      }
    }

    fetchModels()
  }, [settings.ollamaHost, settings.googleApiKey, selectedModel, setSelectedModel])

  const selectedModelData = models.find((m) => m.id === selectedModel)

  // Filter models by search query (case-insensitive contains search)
  const filteredModels = React.useMemo(() => {
    if (!searchQuery) return models
    
    const query = searchQuery.toLowerCase()
    return models.filter(model => 
      model.name.toLowerCase().includes(query) ||
      model.id.toLowerCase().includes(query)
    )
  }, [models, searchQuery])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-[250px] justify-between"
              >
                <span className="truncate">
                  {selectedModelData?.name || 'Select model...'}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>{selectedModelData?.id || 'Select a model'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-[250px] p-0">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Search models..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>No models found.</CommandEmpty>
            {filteredModels.filter((model) => model.provider === 'ollama').length > 0 && (
              <CommandGroup heading="Ollama">
                {filteredModels
                  .filter((model) => model.provider === 'ollama')
                  .map((model) => (
                    <CommandItem
                      key={model.id}
                      value={model.id}
                      onSelect={() => {
                        setSelectedModel(model.id)
                        setOpen(false)
                        setSearchQuery('')
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedModel === model.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className="truncate flex-1">{model.name}</span>
                      {model.vision && (
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Eye className="ml-2 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <p>Supports vision/images</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}
            {filteredModels.filter((model) => model.provider === 'google').length > 0 && (
              <CommandGroup heading="Google AI">
                {filteredModels
                  .filter((model) => model.provider === 'google')
                  .map((model) => (
                    <CommandItem
                      key={model.id}
                      value={model.id}
                      onSelect={() => {
                        setSelectedModel(model.id)
                        setOpen(false)
                        setSearchQuery('')
                      }}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          selectedModel === model.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <span className="truncate flex-1">{model.name}</span>
                      {model.vision && (
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Eye className="ml-2 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <p>Supports vision/images</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
