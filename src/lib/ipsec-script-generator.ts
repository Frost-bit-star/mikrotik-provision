import type { IpsecFormValues } from "./types"

export function generateIpsecScript(v: IpsecFormValues): string {
  const gateway = v.gatewayAddress.trim()
  const psk = v.psk.trim()
  const remote = v.remoteNetwork.trim()
  const local = v.localNetwork.trim()

  return `/ip ipsec peer
add name=ipsec-tunguard address=${gateway} exchange-mode=ike2 \\
    profile=default send-initial-contact=yes \\
    secret="${psk}"

/ip ipsec policy
add name=ipsec-tunguard peer=ipsec-tunguard src-address=${local} \\
    dst-address=${remote} action=encrypt tunnel=yes proposal=default

/ip firewall nat
add chain=srcnat src-address=${local} dst-address=${remote} action=accept \\
    place-before=0 comment="ipsec-tunguard NAT bypass"

/ip firewall filter
add chain=input protocol=udp dst-port=500,4500 action=accept \\
    comment="ipsec-tunguard IKE"
add chain=input protocol=esp action=accept comment="ipsec-tunguard ESP"
add chain=forward src-address=${local} dst-address=${remote} action=accept \\
    comment="ipsec-tunguard tunnel traffic"

:log info "TunGuard IPsec provisioning completed successfully"
:log info "Peer: ${gateway} | Local: ${local} -> Remote: ${remote}"
`
}
