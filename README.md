# TunGuard Provision Generator

Don't fight to get a public IP — TunGuard got you covered.

Generate a MikroTik RouterOS bootstrap script and provision your routers to a self-hosted TunGuard VPN server in seconds.

## Getting Started

### 1. Install TunGuard

```bash
curl -fsSL https://raw.githubusercontent.com/TunGuard/get/main/installer.sh | bash
```

### 2. Open the Generator

Visit the [TunGuard Provision Generator](https://mikrotik-provision.vercel.app) (or run locally with `npm run dev`).

### 3. Enter Your Server Address

```
vpn.example.com
```

or your server's public IP.

> If your domain is behind Cloudflare, use your server's public IP directly — Cloudflare's proxy does not support WireGuard's UDP traffic on port 9000.

### 4. Click Generate Script

The generator validates your TunGuard server, fetches its configuration, and produces a complete RouterOS v7 bootstrap script.

### 5. Import into MikroTik

Copy the script or download the `.rsc` file, then import it on your router:

```
/import tunguard-bootstrap.rsc
```

Your router will automatically:

- Create a WireGuard interface
- Generate its own keypair
- Register with TunGuard
- Apply the assigned VPN configuration
- Connect the tunnel

## Features

- **Zero configuration** — only the server address is required
- **RouterOS v7 compatible** — fully automated bootstrap script
- **No data stored** — completely stateless, runs on Vercel
- **Advanced options** — customize API port, device name, WireGuard interface, MTU, and more

## Troubleshooting

### WireGuard is connected but UDP traffic is being dropped

If your WireGuard tunnel comes up but management access or traffic keeps failing, the usual cause is firewall rule order — the TunGuard allow rule sits below a default `drop` rule on your router.

### Firewall Rule Order

MikroTik firewall rules are processed from top to bottom.

If your router has a default `drop` rule, the TunGuard allow rule must be placed above that rule. If the allow rule is below the drop rule, TunGuard will connect but management access will fail.

Check your firewall order:

```routeros
/ip firewall filter print
```

Move the TunGuard rule above the drop rule:

```routeros
/ip firewall filter move <TunGuard-rule-number> <drop-rule-number>
```

Replace the numbers with the actual rule positions shown by your router.

TunGuard does not automatically reorder firewall rules because existing MikroTik firewall policies vary between installations.

## Development

```bash
npm install
npm run dev
```

Built with Next.js, TypeScript, and Tailwind CSS.
