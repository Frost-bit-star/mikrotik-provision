import axios from "axios"
import type { HealthResponse, StatusResponse, ServerKeyResponse, ProvisionRequest, ProvisionResponse } from "./types"

function createClient(serverAddress: string, apiPort: number) {
  const protocol = serverAddress.includes(":") || serverAddress === "localhost" ? "http" : "https"
  const baseURL = `${protocol}://${serverAddress}:${apiPort}`
  return axios.create({ baseURL, timeout: 10000 })
}

export async function checkHealth(serverAddress: string, apiPort: number): Promise<HealthResponse> {
  const client = createClient(serverAddress, apiPort)
  const { data } = await client.get<HealthResponse>("/api/health")
  return data
}

export async function getStatus(serverAddress: string, apiPort: number): Promise<StatusResponse> {
  const client = createClient(serverAddress, apiPort)
  const { data } = await client.get<StatusResponse>("/api/status")
  return data
}

export async function getServerKey(serverAddress: string, apiPort: number): Promise<ServerKeyResponse> {
  const client = createClient(serverAddress, apiPort)
  const { data } = await client.get<ServerKeyResponse>("/api/server_key")
  return data
}

export async function provisionMikrotik(
  serverAddress: string,
  apiPort: number,
  payload: ProvisionRequest
): Promise<ProvisionResponse> {
  const client = createClient(serverAddress, apiPort)
  const { data } = await client.post<ProvisionResponse>("/api/provision/mikrotik", payload)
  return data
}
