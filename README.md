# TunGuard Provision Generator

Don't fight to get a public IP — TunGuard got you covered.

Generate a MikroTik RouterOS bootstrap script and provision your routers to a self-hosted TunGuard VPN server in seconds.

## Getting Started

### 1. Install TunGuard

```bash
curl -fsSL https://raw.githubusercontent.com/TunGuard/get/main/installer.sh | bash
```

### 2. Open the Generator

Visit the [TunGuard Provision Generator](https://tunguard-provision.vercel.app) (or run locally with `npm run dev`).

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

## Development

```bash
npm install
npm run dev
```

Built with Next.js, TypeScript, and Tailwind CSS.
