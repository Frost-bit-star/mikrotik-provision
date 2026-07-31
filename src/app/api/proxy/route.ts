import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: Request) {
  let serverAddress: string
  let payload: Record<string, unknown>

  try {
    const body = await request.json()
    serverAddress = String(body.server_address || "").trim()
    payload = body.payload || {}
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 })
  }

  if (!serverAddress) {
    return NextResponse.json({ success: false, error: "Missing server address" }, { status: 400 })
  }

  try {
    const response = await fetch(
      `http://${serverAddress}:9000/api/peer/generate-config`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      }
    )

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch {
    return NextResponse.json(
      { success: false, error: "Unable to contact the TunGuard server." },
      { status: 502 }
    )
  }
}
