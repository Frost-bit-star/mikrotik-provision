TunGuard Provision Generator v2 – Complete Project Specification
Overview
Build a modern web application called TunGuard Provision Generator that generates a bootstrap MikroTik RouterOS provisioning script for self-hosted TunGuard servers.
The application will be deployed on Vercel and is completely stateless.
It does not manage VPNs, allocate IP addresses, or store any data.
Its only responsibility is generating a provisioning script that enables MikroTik routers to automatically register themselves with a TunGuard server.

Objective
The provisioning process should require only one piece of information from the user:
TunGuard Server Address

Example

vpn.example.com

or

156.232.88.212
Everything else should happen automatically.

Automated Provisioning Workflow
              User
                 │
                 ▼
     Open Provision Generator
                 │
                 ▼
      Enter Server Address
                 │
                 ▼
      Click Generate Script
                 │
                 ▼
 Generator validates TunGuard server
                 │
                 ▼
 Generator builds Bootstrap Script
                 │
                 ▼
 Download .rsc
                 │
                 ▼
 Import into MikroTik
                 │
                 ▼
 MikroTik creates WireGuard interface
                 │
                 ▼
 RouterOS automatically generates
 Private Key + Public Key
                 │
                 ▼
 MikroTik reads generated Public Key
                 │
                 ▼
 POST Public Key to TunGuard
                 │
                 ▼
 TunGuard
      ├── Allocates VPN IP
      ├── Creates Peer
      ├── Saves Peer
      └── Returns VPN Configuration
                 │
                 ▼
 MikroTik applies returned configuration
                 │
                 ▼
 Tunnel Connected

Generator Responsibilities
The Vercel application only:
Validates the server
Retrieves public server information
Generates a MikroTik bootstrap script
Allows copying or downloading the script
It does not:
Generate WireGuard keys
Allocate VPN addresses
Store peers
Store users
Run WireGuard
Maintain a database

Landing Page
────────────────────────────────────────────

        TunGuard Provision Generator

Provision MikroTik routers for your
self-hosted TunGuard VPN server.

[ Server Address                  ]

[ Generate Script ]

────────────────────────────────────────────

Required Input
Server Address

vpn.example.com

or

156.232.88.212

Advanced Options
API Port

9000

Device Name

Office Router

WireGuard Interface

tunguard

Tunnel Listen Port

13241

Persistent Keepalive

25

MTU

1420

Generator Workflow
Step 1
Validate the server.
GET /api/health
Response
{
    "status":"ok",
    "version":"1.0.0"
}

Step 2
Retrieve server information.
GET /api/status
Example
{
    "listen_port":13231,
    "server_ip":"10.100.0.1",
    "subnet":"10.100.0.0/24",
    "mtu":1420
}

Step 3
Retrieve the server's WireGuard public key.
GET /api/server_key
{
    "public_key":"SERVER_PUBLIC_KEY"
}

Step 4
Generate a bootstrap RouterOS script.
Unlike previous versions, the script must not hard-code a client tunnel IP or create the peer immediately.
Instead, it should:
Create the WireGuard interface.
Allow RouterOS to generate its own keypair.
Read the generated public key.
Register the router with TunGuard.
Wait for the provisioning response.
Apply the assigned configuration.

MikroTik Bootstrap Script
The generated script should perform the following steps:
Create a WireGuard interface.
Generate a WireGuard keypair automatically.
Read the generated public key.
Send a provisioning request to the TunGuard server.
Receive:
Assigned VPN IP
Server public key
Allowed IPs
DNS server
Endpoint
Listen port
Configure the WireGuard peer.
Assign the VPN IP.
Add any required routes.
Log that provisioning completed successfully.
The script should be fully compatible with RouterOS v7.

Proposed TunGuard Provisioning API
To support zero-touch provisioning, TunGuard should expose a dedicated endpoint:
POST /api/provision/mikrotik
Request:
{
    "device_name":"Office Router",
    "public_key":"MIKROTIK_PUBLIC_KEY"
}
TunGuard performs the following:
Validates the request.
Checks whether the peer already exists.
Allocates the next available VPN IP.
Creates the WireGuard peer.
Saves the peer configuration.
Returns all configuration values required by the router.
Example response:
{
    "assigned_ip":"10.100.0.17/32",
    "server_public_key":"SERVER_PUBLIC_KEY",
    "endpoint":"vpn.example.com",
    "listen_port":13231,
    "allowed_ips":"10.100.0.0/24",
    "dns":"1.1.1.1",
    "mtu":1420,
    "persistent_keepalive":25
}

Result Page
──────────────────────────────

✓ Bootstrap Script Generated

──────────────────────────────

┌────────────────────────────┐

RouterOS Bootstrap Script

└────────────────────────────┘

[ Copy ]

[ Download .rsc ]

[ Generate Another ]

──────────────────────────────

User Experience
Display progress while generating:
Connecting to TunGuard...

Validating server...

Retrieving server information...

Generating bootstrap script...

Done.
If successful:
✓ TunGuard server verified.
Bootstrap script generated successfully.
If the server cannot be reached:
Unable to contact the TunGuard server.

Check:

• Server address
• API port
• Firewall
• Reverse proxy
• API availability

Technical Stack
Next.js 15 (App Router)
TypeScript
Tailwind CSS
shadcn/ui
Lucide React
React Hook Form
Zod
Axios
Shiki
Sonner
Vercel
No database.
No authentication.
No server-side persistence.

