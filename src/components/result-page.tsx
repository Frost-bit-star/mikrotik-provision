"use client"

import { useCallback } from "react"
import { Check, Copy, Download, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { generateScript } from "@/lib/script-generator"
import type { FormValues, ProvisionResponse } from "@/lib/types"

interface ResultPageProps {
  provision: ProvisionResponse
  values: FormValues
  error: string | null
  onReset: () => void
}

export function ResultPage({ provision, values, error, onReset }: ResultPageProps) {
  const script = generateScript(values, provision)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(script)
    toast.success("Script copied to clipboard")
  }, [script])

  const handleDownload = useCallback(() => {
    const blob = new Blob([script], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "tunguard-bootstrap.rsc"
    a.click()
    URL.revokeObjectURL(url)
  }, [script])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="rounded-full bg-emerald-500/10 p-2">
          <Check className="h-5 w-5 text-emerald-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Bootstrap Script Generated</h2>
          <p className="text-sm text-muted-foreground">
            TunGuard server verified. Bootstrap script generated successfully.
          </p>
        </div>
      </div>

      <Separator />

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">Assigned IP: {provision.assigned_ip}</Badge>
        <Badge variant="secondary">Endpoint: {provision.endpoint}</Badge>
        <Badge variant="secondary">Listen Port: {provision.listen_port}</Badge>
        <Badge variant="secondary">MTU: {provision.mtu}</Badge>
      </div>

      <div className="relative">
        <pre className="max-h-80 overflow-auto rounded-lg border bg-muted p-4 text-xs leading-relaxed">
          <code>{script}</code>
        </pre>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={handleCopy}>
          <Copy className="h-4 w-4" />
          Copy
        </Button>
        <Button variant="outline" className="flex-1" onClick={handleDownload}>
          <Download className="h-4 w-4" />
          Download .rsc
        </Button>
      </div>

      <Button variant="ghost" onClick={onReset}>
        <RefreshCw className="h-4 w-4" />
        Generate Another
      </Button>
    </div>
  )
}
