import axios from "axios";
import type {
  HealthResponse,
  StatusResponse,
  ServerKeyResponse,
  ProvisionRequest,
  ProvisionResponse,
} from "./types";

const API_PORT = 9000;

function createClient(serverAddress: string) {
  const protocol =
    serverAddress.includes(":") || serverAddress === "localhost"
      ? "http"
      : "https";

  const baseURL = `${protocol}://${serverAddress}:${API_PORT}`;

  return axios.create({
    baseURL,
    timeout: 10000,
  });
}

export async function checkHealth(
  serverAddress: string
): Promise<HealthResponse> {
  const client = createClient(serverAddress);
  const { data } = await client.get<HealthResponse>("/api/health");
  return data;
}

export async function getStatus(
  serverAddress: string
): Promise<StatusResponse> {
  const client = createClient(serverAddress);
  const { data } = await client.get<StatusResponse>("/api/status");
  return data;
}

export async function getServerKey(
  serverAddress: string
): Promise<ServerKeyResponse> {
  const client = createClient(serverAddress);
  const { data } = await client.get<ServerKeyResponse>("/api/server_key");
  return data;
}

export async function provisionMikrotik(
  serverAddress: string,
  payload: ProvisionRequest
): Promise<ProvisionResponse> {
  const client = createClient(serverAddress);
  const { data } = await client.post<ProvisionResponse>(
    "/api/provision/mikrotik",
    payload
  );
  return data;
}
