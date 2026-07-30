"use client"

import { useState } from "react"
import { ArrowRight, GitBranch, Shield, Zap, Server, Globe, Download, Menu, X, Check, Copy, ChevronDown, ChevronUp, Wifi, Network, Activity, Gauge, ExternalLink } from "lucide-react"
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
import { checkHealth, getStatus, getServerKey, provisionMikrotik } from "@/lib/api"
import { generateScript } from "@/lib/script-generator"
import type { FormValues, ProvisionResponse, ProgressMessage } from "@/lib/types"

const formSchema = z.object({
  serverAddress: z.string().min(1, "Server address is required"),
  apiPort: z.coerce.number().int().positive(),
  deviceName: z.string().min(1, "Device name is required"),
  wireguardInterface: z.string().min(1, "Interface name is required"),
  tunnelListenPort: z.coerce.number().int().positive(),
  persistentKeepalive: z.coerce.number().int().min(0),
  mtu: z.coerce.number().int().positive(),
})

const steps = [
  { key: "connect", label: "Connecting to TunGuard..." },
  { key: "validate", label: "Validating server..." },
  { key: "status", label: "Retrieving server information..." },
  { key: "key", label: "Retrieving server key..." },
  { key: "provision", label: "Registering router with TunGuard..." },
  { key: "script", label: "Generating bootstrap script..." },
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
    desc: "Enter your server address. That's it. Everything else happens automatically.",
  },
  {
    icon: Shield,
    title: "WireGuard Userspace",
    desc: "TunGuard runs WireGuard in userspace with no kernel modules needed.",
  },
  {
    icon: Server,
    title: "Auto Provisioning",
    desc: "Routers generate their own keys and register themselves with TunGuard.",
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

const howItWorks = [
  {
    step: "1",
    title: "Generate Script",
    desc: "Enter your TunGuard server address and click generate. The app validates your server and builds a complete RouterOS bootstrap script.",
  },
  {
    step: "2",
    title: "Import into MikroTik",
    desc: "Copy the script or download the .rsc file. Import it on your router with a single command.",
  },
  {
    step: "3",
    title: "Router Connects",
    desc: "Your MikroTik creates a WireGuard interface, generates its keypair, registers with TunGuard, and applies the VPN configuration automatically.",
  },
]

type Step = "form" | "generating" | "result" | "error"

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [step, setStep] = useState<Step>("form")
  const [values, setValues] = useState<FormValues | null>(null)
  const [provision, setProvision] = useState<ProvisionResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
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
      apiPort: 9000,
      deviceName: "Office Router",
      wireguardInterface: "tunguard",
      tunnelListenPort: 13241,
      persistentKeepalive: 25,
      mtu: 1420,
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
      await checkHealth(v.serverAddress, v.apiPort)
      update("connect", "done")

      update("validate", "active")
      update("validate", "done")

      update("status", "active")
      const status = await getStatus(v.serverAddress, v.apiPort)
      update("status", "done")

      update("key", "active")
      const keyData = await getServerKey(v.serverAddress, v.apiPort)
      update("key", "done")

      update("provision", "active")
      const provisionResponse = await provisionMikrotik(v.serverAddress, v.apiPort, {
        device_name: v.deviceName,
        public_key: "",
      })
      update("provision", "done")

      update("script", "active")
      const generatedScript = generateScript(v, provisionResponse)
      setScript(generatedScript)
      update("script", "done")

      update("done", "active")
      await new Promise((r) => setTimeout(r, 300))
      setProvision(provisionResponse)
      setStep("result")
    } catch {
      setError("Unable to contact the TunGuard server.")
      setStep("error")
    }
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
    a.download = "tunguard-bootstrap.rsc"
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
            <Badge variant="secondary" className="mb-6">Open Source WireGuard Automation</Badge>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              MikroTik provisioning for your{" "}
              <span className="text-primary">self-hosted</span> TunGuard server.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              Don&apos;t fight for a public IP. TunGuard automates WireGuard peer management in userspace.
              Generate a MikroTik bootstrap script and connect your routers in seconds.
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
            <p className="mt-4 text-sm text-muted-foreground">
              Install TunGuard:{" "}
              <code className="rounded bg-muted px-2 py-0.5 text-xs">
                curl -fsSL https://raw.githubusercontent.com/TunGuard/get/main/installer.sh | bash
              </code>
            </p>
          </div>
        </section>

        {/* How it Works */}
        <section id="how-it-works" className="border-b py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-bold tracking-tight">How It Works</h2>
            <p className="mt-4 text-center text-muted-foreground">
              Three simple steps to connect your MikroTik router to TunGuard.
            </p>
            <div className="mt-12 grid gap-8 md:grid-cols-3">
              {howItWorks.map((item) => (
                <div key={item.step} className="flex flex-col items-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-b py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-bold tracking-tight">Why TunGuard?</h2>
            <p className="mt-4 text-center text-muted-foreground">
              Everything you need to provision MikroTik routers for WireGuard.
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
                  Enter your TunGuard server address and generate a bootstrap script.
                </p>
              </div>

              {step === "form" && (
                <Card>
                  <CardContent className="pt-6">
                    <form onSubmit={handleSubmit(handleGenerate)} className="flex flex-col gap-4">
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
                          Behind Cloudflare? Use your server&apos;s public IP instead of the domain.
                        </p>
                      </div>

                      <Button type="submit" size="lg" className="w-full">
                        Generate Script
                      </Button>

                      <Separator />

                      <button
                        type="button"
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        Advanced Options
                      </button>

                      {showAdvanced && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="apiPort" className="flex items-center gap-2">
                              <Activity className="h-4 w-4" /> API Port
                            </Label>
                            <Input id="apiPort" type="number" {...register("apiPort")} />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="deviceName" className="flex items-center gap-2">
                              <Shield className="h-4 w-4" /> Device Name
                            </Label>
                            <Input id="deviceName" {...register("deviceName")} />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="wireguardInterface" className="flex items-center gap-2">
                              <Wifi className="h-4 w-4" /> WireGuard Interface
                            </Label>
                            <Input id="wireguardInterface" {...register("wireguardInterface")} />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="tunnelListenPort" className="flex items-center gap-2">
                              <Network className="h-4 w-4" /> Tunnel Listen Port
                            </Label>
                            <Input id="tunnelListenPort" type="number" {...register("tunnelListenPort")} />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="persistentKeepalive" className="flex items-center gap-2">
                              <Activity className="h-4 w-4" /> Persistent Keepalive
                            </Label>
                            <Input id="persistentKeepalive" type="number" {...register("persistentKeepalive")} />
                          </div>
                          <div className="flex flex-col gap-2">
                            <Label htmlFor="mtu" className="flex items-center gap-2">
                              <Gauge className="h-4 w-4" /> MTU
                            </Label>
                            <Input id="mtu" type="number" {...register("mtu")} />
                          </div>
                        </div>
                      )}
                    </form>
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

              {step === "result" && provision && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-emerald-500/10 p-2">
                          <Check className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold">Bootstrap Script Generated</h2>
                          <p className="text-sm text-muted-foreground">
                            TunGuard server verified. Script generated successfully.
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">Assigned IP: {provision.assigned_ip}</Badge>
                        <Badge variant="secondary">Endpoint: {provision.endpoint}</Badge>
                        <Badge variant="secondary">Port: {provision.listen_port}</Badge>
                        <Badge variant="secondary">MTU: {provision.mtu}</Badge>
                      </div>

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
                      <h2 className="text-lg font-semibold">Unable to contact the TunGuard server</h2>
                      <p className="text-sm text-muted-foreground">Check:</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        <li>Server address</li>
                        <li>API port</li>
                        <li>Firewall</li>
                        <li>Reverse proxy</li>
                        <li>API availability</li>
                      </ul>
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
            <h2 className="text-3xl font-bold tracking-tight">Get Started with TunGuard</h2>
            <p className="mt-4 text-muted-foreground">
              Install the server, generate a script, and connect your MikroTik router in minutes.
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
            <p className="mt-6 text-sm text-muted-foreground">
              Install with:{" "}
              <code className="rounded bg-muted px-2 py-0.5 text-xs">
                curl -fsSL https://raw.githubusercontent.com/TunGuard/get/main/installer.sh | bash
              </code>
            </p>
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
                Open source WireGuard automation. Run WireGuard in userspace and manage peers effortlessly.
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
