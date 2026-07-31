"use client"

import { useState } from "react"
import axios from "axios"
import { ArrowRight, GitBranch, Shield, Zap, Server, Globe, Download, Menu, X, Check, Copy, Smartphone, ExternalLink, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { generateConfig } from "@/lib/api"
import { generateScript, parseWireGuardConfig } from "@/lib/script-generator"
import { generateIpsecScript } from "@/lib/ipsec-script-generator"
import { IpsecForm } from "@/components/ipsec-form"
import type { FormValues, WireGuardConfig, ProgressMessage, IpsecFormValues, ConnectionType } from "@/lib/types"

const formSchema = z.object({
  serverAddress: z.string().min(1, "Server address is required"),
  deviceName: z.string().min(1, "Device name is required"),
})

const steps = [
  { key: "connect", label: "Connecting to TunGuard server..." },
  { key: "config", label: "Generating WireGuard config..." },
  { key: "script", label: "Generating MikroTik script..." },
  { key: "done", label: "Done." },
]

const testimonials = [
  {
    quote: "Setting up WireGuard on MikroTik was a nightmare until TunGuard. Now it's one command.",
    author: "Alex K.",
    role: "Network Engineer",
  },
  {
    quote: "No more fighting with public IPs or complex configs. TunGuard just works.",
    author: "Sarah M.",
    role: "IT Director",
  },
  {
    quote: "The provisioning generator saved us hours of manual config per router. Absolute game changer.",
    author: "David L.",
    role: "DevOps Lead",
  },
]

const features = [
  {
    icon: Zap,
    title: "Zero Config",
    desc: "Pick a method, enter a few details, and get a complete RouterOS bootstrap script. That's it.",
  },
  {
    icon: Shield,
    title: "WireGuard Userspace",
    desc: "TunGuard runs WireGuard in userspace with no kernel modules needed.",
  },
  {
    icon: Server,
    title: "Auto Provisioning",
    desc: "The server creates the keypair and config. Your router just applies it.",
  },
  {
    icon: Globe,
    title: "RouterOS v7",
    desc: "Fully compatible bootstrap scripts for MikroTik RouterOS version 7.",
  },
  {
    icon: Download,
    title: "Copy or Download",
    desc: "Copy to clipboard or download as .rsc and import directly into your router.",
  },
  {
    icon: GitBranch,
    title: "Open Source",
    desc: "TunGuard is fully open source. Self-host on your own infrastructure.",
  },
]

const deploymentOptions = [
  {
    icon: Shield,
    title: "TunGuard WireGuard",
    tagline: "Automated WireGuard with a peer dashboard",
    bestFor: "You manage many routers, especially behind CGNAT or dynamic IPs, and want one control plane.",
    points: [
      "Self-hosted server with a dashboard for every peer and keypair",
      "Jump host + built-in SSH terminal to reach any router",
      "Works behind CGNAT: routers dial out and reconnect automatically",
      "Auto-assigned IPs, no manual config per router",
    ],
  },
  {
    icon: KeyRound,
    title: "Native IPsec",
    tagline: "Site-to-site script for an existing gateway",
    bestFor: "You already run an IPsec gateway and just need a router pointed at it.",
    points: [
      "Generates a RouterOS IPsec script, no TunGuard server needed",
      "Connects your local LAN to a remote LAN",
      "Works with MikroTik CHR, strongSwan, or any IKEv2 gateway",
      "No peer dashboard: peers are managed on your own gateway",
    ],
  },
]

const howItWorks = [
  {
    step: "1",
    title: "Choose a Method",
    desc: "Pick TunGuard WireGuard or Native IPsec, enter the few details, and get a complete RouterOS bootstrap script.",
  },
  {
    step: "2",
    title: "Import into MikroTik",
    desc: "Copy the script or download the .rsc file. Import it on your router with a single command.",
  },
  {
    step: "3",
    title: "Router Connects",
    desc: "WireGuard registers with your TunGuard server; IPsec dials your gateway. The tunnel comes up automatically.",
  },
]

type Step = "form" | "generating" | "result" | "error"

function extractError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined
    if (data?.error) return data.error
    if (err.code === "ERR_NETWORK") return "Unable to contact the TunGuard server."
    return err.message
  }
  if (err instanceof Error) return err.message
  return "Unable to contact the TunGuard server."
}

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [step, setStep] = useState<Step>("form")
  const [connectionType, setConnectionType] = useState<ConnectionType>("wireguard")
  const [values, setValues] = useState<FormValues | null>(null)
  const [provision, setProvision] = useState<WireGuardConfig | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ProgressMessage[]>([])
  const [script, setScript] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serverAddress: "",
      deviceName: "Office Router",
    },
  })

  const handleGenerate = async (v: FormValues) => {
    setValues(v)
    setError(null)
    setStep("generating")
    setMessages(steps.map((s) => ({ label: s.label, status: s.key === "connect" ? "active" : "pending" })))

    const update = (key: string, status: "active" | "done" | "error") => {
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

    try {
      update("connect", "active")
      const response = await generateConfig(v.serverAddress, {
        device_name: v.deviceName,
        server_host: v.serverAddress,
      })
      update("connect", "done")

      update("config", "active")
      if (!response.success || !response.config) {
        throw new Error(response.error || "Server returned no config.")
      }
      const wg = parseWireGuardConfig(response.config)
      update("config", "done")

      update("script", "active")
      const generatedScript = generateScript("tunguard", wg)
      setScript(generatedScript)
      update("script", "done")

      update("done", "active")
      await new Promise((r) => setTimeout(r, 300))
      setProvision(wg)
      setStep("result")
    } catch (err) {
      setError(extractError(err))
      setStep("error")
    }
  }

  const handleIpsecGenerate = (v: IpsecFormValues) => {
    setValues(null)
    setProvision(null)
    setError(null)
    setScript(generateIpsecScript(v))
    setStep("result")
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(script)
    toast.success("Script copied to clipboard")
  }

  const handleDownload = () => {
    const blob = new Blob([script], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = connectionType === "wireguard" ? "tunguard-bootstrap.rsc" : "tunguard-ipsec.rsc"
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    setStep("form")
    setValues(null)
    setProvision(null)
    setError(null)
    setScript("")
    setMessages([])
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">TunGuard</span>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#generator" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Generator</a>
            <a href="https://github.com/tunguard" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              Docs <ExternalLink className="h-3 w-3" />
            </a>
            <a href="https://github.com/tunguard" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2">
                <GitBranch className="h-4 w-4" />
                GitHub
              </Button>
            </a>
          </nav>
          <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {mobileOpen && (
          <div className="border-t px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-3">
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>How it Works</a>
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Features</a>
              <a href="#generator" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Generator</a>
              <a href="https://github.com/tunguard" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Docs</a>
              <a href="https://github.com/tunguard" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <GitBranch className="h-4 w-4" />
                  GitHub
                </Button>
              </a>
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
          <div className="relative mx-auto flex max-w-6xl flex-col items-center px-4 py-20 text-center lg:py-32">
            <Badge variant="secondary" className="mb-6">Open Source MikroTik Provisioning</Badge>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Provision your MikroTik routers,{" "}
              <span className="text-primary">WireGuard or IPsec</span>.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              Two deployment methods, one dashboard. Use TunGuard for automated WireGuard with peer
              management and jump-host access behind CGNAT, or generate a native IPsec script for
              your existing gateway. Generate a RouterOS script and connect in seconds.
            </p>
            <div className="mt-8 flex gap-4">
              <Button size="lg" asChild>
                <a href="#generator">
                  Generate Script <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="https://github.com/tunguard" target="_blank" rel="noopener noreferrer">
                  <GitBranch className="h-4 w-4" />
                  View on GitHub
                </a>
              </Button>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section id="how-it-works" className="border-b py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-bold tracking-tight">TunGuard vs Native IPsec</h2>
            <p className="mt-4 text-center text-muted-foreground">
              Two deployment methods. Pick the one that fits your setup.
            </p>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {deploymentOptions.map((opt) => {
                const Icon = opt.icon
                return (
                  <Card key={opt.title}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{opt.title}</h3>
                          <p className="text-xs text-muted-foreground">{opt.tagline}</p>
                        </div>
                      </div>
                      <ul className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
                        {opt.points.map((point) => (
                          <li key={point} className="flex items-start gap-2">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            {point}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">Best when: </span>
                        {opt.bestFor}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <h3 className="mt-20 text-center text-2xl font-bold tracking-tight">How It Works</h3>
            <div className="mt-8 grid gap-8 md:grid-cols-3">
              {howItWorks.map((item) => (
                <div key={item.step} className="flex flex-col items-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <h4 className="mt-4 text-lg font-semibold">{item.title}</h4>
                  <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-b py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-bold tracking-tight">Why This Dashboard?</h2>
            <p className="mt-4 text-center text-muted-foreground">
              Everything you need to provision MikroTik routers, for WireGuard or IPsec.
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => {
                const Icon = f.icon
                return (
                  <Card key={f.title}>
                    <CardContent className="pt-6">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="mt-4 font-semibold">{f.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </section>

        {/* Generator */}
        <section id="generator" className="border-b py-20">
          <div className="mx-auto max-w-6xl px-4">
            <div className="mx-auto max-w-lg">
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold tracking-tight">Provision Generator</h2>
                <p className="mt-2 text-muted-foreground">
                  Choose your deployment method and generate a RouterOS bootstrap script.
                </p>
              </div>

              {step === "form" && (
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setConnectionType("wireguard")}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors",
                      connectionType === "wireguard"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Shield className="h-5 w-5 text-primary" />
                    <span className="text-sm font-semibold">TunGuard WireGuard</span>
                    <span className="text-xs text-muted-foreground">Self-hosted WireGuard server</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConnectionType("ipsec")}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg border p-4 transition-colors",
                      connectionType === "ipsec"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <KeyRound className="h-5 w-5 text-primary" />
                    <span className="text-sm font-semibold">Native IPsec</span>
                    <span className="text-xs text-muted-foreground">Your existing IPsec gateway</span>
                  </button>
                </div>
              )}

              {step === "form" && connectionType === "wireguard" && (
                <Card>
                  <CardContent className="pt-6">
                    <form onSubmit={handleSubmit(handleGenerate)} className="flex flex-col gap-4">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="deviceName" className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          Device Name
                        </Label>
                        <Input
                          id="deviceName"
                          placeholder="my-phone"
                          {...register("deviceName")}
                        />
                        {errors.deviceName && (
                          <p className="text-xs text-destructive">{errors.deviceName.message}</p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        <Label htmlFor="serverAddress" className="flex items-center gap-2">
                          <Server className="h-4 w-4" />
                          Server IP
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
                          Calls <code className="rounded bg-muted px-1 py-0.5 text-xs">http://{`{ip}`}:9000/api/peer/generate-config</code>
                        </p>
                      </div>

                      <Button type="submit" size="lg" className="w-full">
                        Generate Script
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}

              {step === "form" && connectionType === "ipsec" && (
                <Card>
                  <CardContent className="pt-6">
                    <IpsecForm onGenerate={handleIpsecGenerate} />
                  </CardContent>
                </Card>
              )}

              {step === "generating" && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col gap-3 py-4">
                      {messages.map((msg) => (
                        <div key={msg.label} className="flex items-center gap-3">
                          <div className="flex h-5 w-5 items-center justify-center">
                            {msg.status === "pending" && <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />}
                            {msg.status === "active" && <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />}
                            {msg.status === "done" && <Check className="h-4 w-4 text-emerald-500" />}
                            {msg.status === "error" && <div className="h-2 w-2 rounded-full bg-destructive" />}
                          </div>
                          <span className={`text-sm ${
                            msg.status === "active" ? "font-medium text-foreground" :
                            msg.status === "done" ? "text-muted-foreground" :
                            "text-muted-foreground/50"
                          }`}>
                            {msg.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {step === "result" && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-emerald-500/10 p-2">
                          <Check className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold">Bootstrap Script Generated</h2>
                          {connectionType === "wireguard" && values?.deviceName ? (
                            <p className="text-sm text-muted-foreground">
                              {values.deviceName} is ready. Apply this script on your MikroTik.
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              IPsec config generated. Apply this script on your MikroTik.
                            </p>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {connectionType === "wireguard" && provision && (
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">Assigned IP: {provision.address}</Badge>
                          <Badge variant="secondary">Endpoint: {provision.endpoint_host}:{provision.endpoint_port}</Badge>
                          <Badge variant="secondary">Allowed IPs: {provision.allowed_ips}</Badge>
                          <Badge variant="secondary">DNS: {provision.dns}</Badge>
                        </div>
                      )}

                      <div className="relative">
                        <pre className="max-h-80 overflow-auto rounded-lg border bg-muted p-4 text-xs leading-relaxed">
                          <code>{script}</code>
                        </pre>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={handleCopy}>
                          <Copy className="h-4 w-4" /> Copy
                        </Button>
                        <Button variant="outline" className="flex-1" onClick={handleDownload}>
                          <Download className="h-4 w-4" /> Download .rsc
                        </Button>
                      </div>

                      <Button variant="ghost" onClick={handleReset}>
                        Generate Another
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {step === "error" && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="rounded-full bg-destructive/10 p-3">
                        <Shield className="h-6 w-6 text-destructive" />
                      </div>
                      <h2 className="text-lg font-semibold">Failed to generate config</h2>
                      <p className="text-sm text-muted-foreground">{error}</p>
                      <p className="text-sm text-muted-foreground">Check the server IP, port 9000, and firewall.</p>
                      <Button variant="outline" onClick={handleReset}>Try Again</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="border-b py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-bold tracking-tight">Trusted by Network Engineers</h2>
            <p className="mt-4 text-center text-muted-foreground">
              But don&apos;t just take our word for it.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {testimonials.map((t) => (
                <Card key={t.author}>
                  <CardContent className="pt-6">
                    <p className="text-sm leading-relaxed text-muted-foreground">&ldquo;{t.quote}&rdquo;</p>
                    <div className="mt-4">
                      <p className="text-sm font-semibold">{t.author}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-3xl font-bold tracking-tight">Get Started</h2>
            <p className="mt-4 text-muted-foreground">
              Choose TunGuard WireGuard or Native IPsec, generate a script, and connect your MikroTik
              router in minutes.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button size="lg" asChild>
                <a href="#generator">
                  Generate Script <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="https://github.com/tunguard" target="_blank" rel="noopener noreferrer">
                  <GitBranch className="h-4 w-4" />
                  GitHub
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-lg font-bold">TunGuard</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Open source MikroTik provisioning. Automate WireGuard with TunGuard or generate a
                native IPsec script, all from one dashboard.
              </p>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#generator" className="hover:text-foreground transition-colors">Generator</a></li>
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="https://github.com/tunguard" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors flex items-center gap-1">Docs <ExternalLink className="h-3 w-3" /></a></li>
                <li><a href="https://github.com/tunguard" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a></li>
                <li><a href="https://github.com/tunguard" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Install</a></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><span className="hover:text-foreground transition-colors cursor-default">MIT License</span></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
            <p>TunGuard is open source software. WireGuard is a registered trademark of Jason A. Donenfeld.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
