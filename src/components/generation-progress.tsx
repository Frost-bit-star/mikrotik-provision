"use client"

import { useEffect, useState } from "react"
import { Check, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { checkHealth, getStatus, getServerKey, provisionMikrotik } from "@/lib/api"
import { generateScript } from "@/lib/script-generator"
import type { FormValues, ProvisionResponse, ProgressMessage } from "@/lib/types"

interface GenerationProgressProps {
  values: FormValues
  onComplete: (provision: ProvisionResponse) => void
  onError: (msg: string) => void
}

const steps: { key: string; label: string }[] = [
  { key: "connect", label: "Connecting to TunGuard..." },
  { key: "validate", label: "Validating server..." },
  { key: "status", label: "Retrieving server information..." },
  { key: "key", label: "Retrieving server key..." },
  { key: "provision", label: "Registering router with TunGuard..." },
  { key: "script", label: "Generating bootstrap script..." },
  { key: "done", label: "Done." },
]

export function GenerationProgress({ values, onComplete, onError }: GenerationProgressProps) {
  const [messages, setMessages] = useState<ProgressMessage[]>(
    steps.map((s) => ({ label: s.label, status: s.key === "connect" ? "active" : "pending" }))
  )

  useEffect(() => {
    let cancelled = false

    const update = (key: string, status: "active" | "done" | "error") => {
      if (cancelled) return
      setMessages((prev) =>
        prev.map((m) => {
          if (m.label === steps.find((s) => s.key === key)?.label) {
            return { ...m, status }
          }
          if (status === "active") {
            const stepIdx = steps.findIndex((s) => s.key === key)
            const currentIdx = steps.findIndex((s) => s.label === m.label)
            if (currentIdx < stepIdx && m.status === "pending") {
              return { ...m, status: "done" }
            }
          }
          return m
        })
      )
    }

    const run = async () => {
      try {
        update("connect", "active")
        await checkHealth(values.serverAddress, values.apiPort)
        update("connect", "done")

        update("validate", "active")
        update("validate", "done")

        update("status", "active")
        const status = await getStatus(values.serverAddress, values.apiPort)
        update("status", "done")

        update("key", "active")
        const keyData = await getServerKey(values.serverAddress, values.apiPort)
        update("key", "done")

        update("provision", "active")
        const provision = await provisionMikrotik(values.serverAddress, values.apiPort, {
          device_name: values.deviceName,
          public_key: "",
        })
        update("provision", "done")

        update("script", "active")
        const script = generateScript(values, provision)
        update("script", "done")

        update("done", "active")

        await new Promise((r) => setTimeout(r, 300))

        if (!cancelled) {
          onComplete(provision)
        }
      } catch {
        if (!cancelled) {
          onError("Unable to contact the TunGuard server.")
        }
      }
    }

    run()

    return () => {
      cancelled = true
    }
  }, [values, onComplete, onError])

  return (
    <div className="flex flex-col gap-3 py-4">
      {messages.map((msg) => (
        <div key={msg.label} className="flex items-center gap-3">
          <div className="flex h-5 w-5 items-center justify-center">
            {msg.status === "pending" && (
              <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
            )}
            {msg.status === "active" && (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
            {msg.status === "done" && (
              <Check className="h-4 w-4 text-emerald-500" />
            )}
            {msg.status === "error" && (
              <X className="h-4 w-4 text-destructive" />
            )}
          </div>
          <span
            className={cn(
              "text-sm",
              msg.status === "active" && "font-medium text-foreground",
              msg.status === "done" && "text-muted-foreground",
              msg.status === "pending" && "text-muted-foreground/50"
            )}
          >
            {msg.label}
          </span>
        </div>
      ))}
    </div>
  )
}
