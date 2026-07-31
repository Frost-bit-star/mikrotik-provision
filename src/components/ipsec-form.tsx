"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Globe, KeyRound, Network, Route, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { IpsecFormValues } from "@/lib/types"

const formSchema = z.object({
  gatewayAddress: z.string().min(1, "Gateway address is required"),
  psk: z.string().min(8, "Pre-shared key must be at least 8 characters"),
  remoteNetwork: z.string().min(1, "Remote network is required"),
  localNetwork: z.string().min(1, "Local network is required"),
})

function randomPsk(length = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  const arr = new Uint8Array(length)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => chars[b % chars.length]).join("")
}

interface IpsecFormProps {
  onGenerate: (values: IpsecFormValues) => void
}

export function IpsecForm({ onGenerate }: IpsecFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<IpsecFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gatewayAddress: "",
      psk: "",
      remoteNetwork: "10.100.0.0/24",
      localNetwork: "192.168.88.0/24",
    },
  })

  return (
    <form onSubmit={handleSubmit(onGenerate)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="gatewayAddress" className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          Gateway Address
        </Label>
        <Input
          id="gatewayAddress"
          placeholder="vpn.example.com"
          {...register("gatewayAddress")}
        />
        {errors.gatewayAddress && (
          <p className="text-xs text-destructive">{errors.gatewayAddress.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Public IP or domain of your IPsec gateway (MikroTik CHR, strongSwan, etc.)
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="psk" className="flex items-center gap-2">
          <KeyRound className="h-4 w-4" />
          Pre-Shared Key
        </Label>
        <div className="flex gap-2">
          <Input
            id="psk"
            placeholder="Enter or generate a key"
            {...register("psk")}
          />
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => setValue("psk", randomPsk(), { shouldValidate: true })}
          >
            <RefreshCw className="h-4 w-4" />
            Generate
          </Button>
        </div>
        {errors.psk && (
          <p className="text-xs text-destructive">{errors.psk.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Must match the key configured on your IPsec gateway.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="remoteNetwork" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Remote Network
          </Label>
          <Input id="remoteNetwork" {...register("remoteNetwork")} />
          {errors.remoteNetwork && (
            <p className="text-xs text-destructive">{errors.remoteNetwork.message}</p>
          )}
          <p className="text-xs text-muted-foreground">Subnet behind the gateway</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="localNetwork" className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            Local Network
          </Label>
          <Input id="localNetwork" {...register("localNetwork")} />
          {errors.localNetwork && (
            <p className="text-xs text-destructive">{errors.localNetwork.message}</p>
          )}
          <p className="text-xs text-muted-foreground">This router&apos;s LAN</p>
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full">
        Generate RouterOS Script
      </Button>
    </form>
  )
}
