export interface GenerateConfigRequest {
  device_name: string
  server_host: string
}

export interface GenerateConfigResponse {
  success: boolean
  config?: string
  allowed_ip?: string
  device_name?: string
  error?: string
}

export interface WireGuardConfig {
  private_key: string
  address: string
  dns: string
  server_public_key: string
  endpoint_host: string
  endpoint_port: number
  allowed_ips: string
  persistent_keepalive: number
}

export interface FormValues {
  serverAddress: string
  deviceName: string
}

export type Step = "form" | "generating" | "result" | "error"

export interface ProgressMessage {
  label: string
  status: "pending" | "active" | "done" | "error"
}
