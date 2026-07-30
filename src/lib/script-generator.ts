import type { ProvisionResponse, FormValues } from "./types"

export function generateScript(
  values: FormValues,
  provision: ProvisionResponse
): string {
  return `/interface wireguard
add listen-port=${values.tunnelListenPort} mtu=${provision.mtu} name=${values.wireguardInterface}

/interface wireguard peers
add allowed-address=${provision.allowed_ips} endpoint-address=${provision.endpoint} \\
    endpoint-port=${provision.listen_port} interface=${values.wireguardInterface} \\
    persistent-keepalive=${provision.persistent_keepalive} \\
    public-key="${provision.server_public_key}"

/ip address
add address=${provision.assigned_ip} interface=${values.wireguardInterface}

/ip route
add disabled=no dst-address=${provision.allowed_ips} gateway=${values.wireguardInterface}

/ip dns
set servers=${provision.dns}

:log info "TunGuard provisioning completed successfully"
`
}
