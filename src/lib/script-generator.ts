import type { WireGuardConfig } from "./types"

export function parseWireGuardConfig(config: string): WireGuardConfig {
  const values: Record<string, string> = {}
  let section = ""

  for (const raw of config.split("\n")) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue

    const sectionMatch = line.match(/^\[(.+)\]$/)
    if (sectionMatch) {
      section = sectionMatch[1].toLowerCase()
      continue
    }

    const eq = line.indexOf("=")
    if (eq === -1) continue

    const key = line.slice(0, eq).trim().toLowerCase()
    values[`${section}_${key}`] = line.slice(eq + 1).trim()
  }

  const endpoint = values["peer_endpoint"] || ""
  const lastColon = endpoint.lastIndexOf(":")
  const endpointHost = lastColon === -1 ? endpoint : endpoint.slice(0, lastColon).replace(/^\[|\]$/g, "")
  const endpointPort = lastColon === -1 ? 13231 : parseInt(endpoint.slice(lastColon + 1), 10)

  return {
    private_key: values["interface_privatekey"] || "",
    address: values["interface_address"] || "",
    dns: values["interface_dns"] || "1.1.1.1",
    server_public_key: values["peer_publickey"] || "",
    endpoint_host: endpointHost,
    endpoint_port: isNaN(endpointPort) ? 13231 : endpointPort,
    allowed_ips: values["peer_allowedips"] || "0.0.0.0/0",
    persistent_keepalive: parseInt(values["peer_persistentkeepalive"] || "25", 10),
  }
}

export function generateScript(
  interfaceName: string,
  config: WireGuardConfig
): string {
  const routeTarget = config.allowed_ips
    .split(",")
    .map((s) => s.trim())
    .find((s) => !s.includes(":")) || config.allowed_ips.split(",")[0].trim()

  return `/interface wireguard
add mtu=1420 name=${interfaceName} private-key="${config.private_key}"

/interface wireguard peers
add allowed-address=${config.allowed_ips} endpoint-address=${config.endpoint_host} \\
    endpoint-port=${config.endpoint_port} interface=${interfaceName} \\
    persistent-keepalive=${config.persistent_keepalive} \\
    public-key="${config.server_public_key}"

/ip address
add address=${config.address} interface=${interfaceName}

/ip route
add disabled=no dst-address=${routeTarget} gateway=${interfaceName}

/ip dns
set servers=${config.dns}

:log info "TunGuard provisioning completed successfully"
`
}
