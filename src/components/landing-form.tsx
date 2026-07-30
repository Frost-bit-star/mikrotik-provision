"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ChevronDown, ChevronUp, Server, Wifi, Network, Shield, Activity, Gauge } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import type { FormValues } from "@/lib/types"

const formSchema = z.object({
  serverAddress: z.string().min(1, "Server address is required"),
  apiPort: z.coerce.number().int().positive(),
  deviceName: z.string().min(1, "Device name is required"),
  wireguardInterface: z.string().min(1, "Interface name is required"),
  tunnelListenPort: z.coerce.number().int().positive(),
  persistentKeepalive: z.coerce.number().int().min(0),
  mtu: z.coerce.number().int().positive(),
})

interface LandingFormProps {
  onGenerate: (values: FormValues) => void
}

export function LandingForm({ onGenerate }: LandingFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serverAddress: "",
      apiPort: 9000,
      deviceName: "Office Router",
      wireguardInterface: "tunguard",
      tunnelListenPort: 13241,
      persistentKeepalive: 25,
      mtu: 1420,
    },
  })

  return (
    <form onSubmit={handleSubmit(onGenerate)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="serverAddress" className="flex items-center gap-2">
          <Server className="h-4 w-4" />
          Server Address
        </Label>
        <Input
          id="serverAddress"
          placeholder="vpn.example.com"
          {...register("serverAddress")}
        />
        {errors.serverAddress && (
          <p className="text-xs text-destructive">{errors.serverAddress.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          e.g. vpn.example.com or your server IP
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400">
          Behind Cloudflare? Use your server's public IP instead of the domain.
        </p>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        Generate Script
      </Button>

      <Separator />

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {showAdvanced ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
        Advanced Options
      </button>

      {showAdvanced && (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="apiPort" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              API Port
            </Label>
            <Input id="apiPort" type="number" {...register("apiPort")} />
            {errors.apiPort && (
              <p className="text-xs text-destructive">{errors.apiPort.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="deviceName" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Device Name
            </Label>
            <Input id="deviceName" {...register("deviceName")} />
            {errors.deviceName && (
              <p className="text-xs text-destructive">{errors.deviceName.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="wireguardInterface" className="flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              WireGuard Interface
            </Label>
            <Input id="wireguardInterface" {...register("wireguardInterface")} />
            {errors.wireguardInterface && (
              <p className="text-xs text-destructive">{errors.wireguardInterface.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="tunnelListenPort" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Tunnel Listen Port
            </Label>
            <Input id="tunnelListenPort" type="number" {...register("tunnelListenPort")} />
            {errors.tunnelListenPort && (
              <p className="text-xs text-destructive">{errors.tunnelListenPort.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="persistentKeepalive" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Persistent Keepalive
            </Label>
            <Input id="persistentKeepalive" type="number" {...register("persistentKeepalive")} />
            {errors.persistentKeepalive && (
              <p className="text-xs text-destructive">{errors.persistentKeepalive.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="mtu" className="flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              MTU
            </Label>
            <Input id="mtu" type="number" {...register("mtu")} />
            {errors.mtu && (
              <p className="text-xs text-destructive">{errors.mtu.message}</p>
            )}
          </div>
        </div>
      )}
    </form>
  )
}
