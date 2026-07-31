import axios from "axios";
import type {
  GenerateConfigRequest,
  GenerateConfigResponse,
} from "./types";

const API_PORT = 9000;

function createClient(serverAddress: string) {
  const baseURL = `http://${serverAddress}:${API_PORT}`;

  return axios.create({
    baseURL,
    timeout: 10000,
  });
}

export async function generateConfig(
  serverAddress: string,
  payload: GenerateConfigRequest
): Promise<GenerateConfigResponse> {
  const client = createClient(serverAddress);

  const { data } = await client.post<GenerateConfigResponse>(
    "/api/peer/generate-config",
    payload
  );

  return data;
}
