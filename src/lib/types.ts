export interface HealthResponse {
  status: string
  version: string
}

export interface StatusResponse {
  listen_port: number
  server_ip: string
  subnet: string
  mtu: number
}

export interface ServerKeyResponse {
  public_key: string
}

export interface ProvisionRequest {
  device_name: string
  public_key: string
}

export interface ProvisionResponse {
  assigned_ip: string
  server_public_key: string
  endpoint: string
  listen_port: number
  allowed_ips: string
  dns: string
  mtu: number
  persistent_keepalive: number
}

export interface FormValues {
  serverAddress: string
  apiPort: number
  deviceName: string
  wireguardInterface: string
  tunnelListenPort: number
  persistentKeepalive: number
  mtu: number
}

export type Step = "form" | "generating" | "result" | "error"

export interface ProgressMessage {
  label: string
  status: "pending" | "active" | "done" | "error"
}
