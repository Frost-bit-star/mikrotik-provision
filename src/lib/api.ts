import axios from "axios";
import type {
  GenerateConfigRequest,
  GenerateConfigResponse,
} from "./types";

export async function generateConfig(
  serverAddress: string,
  payload: GenerateConfigRequest
): Promise<GenerateConfigResponse> {
  const { data } = await axios.post<GenerateConfigResponse>("/api/proxy", {
    server_address: serverAddress,
    payload,
  });

  return data;
}
