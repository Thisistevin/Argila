import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  handleAsaasPaymentOverdue,
  handleAsaasPaymentReceived,
  isPaymentOverdueEvent,
  isPaymentReceivedEvent,
  normalizeAsaasEvent,
} from "@/lib/billing/webhook-handlers";

export async function POST(request: NextRequest) {
  const secret = process.env.ASAAS_WEBHOOK_SECRET;
  const token =
    request.headers.get("asaas-access-token") ??
    request.headers.get("x-asaas-token");
  if (!secret || token !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const event = String(body.event ?? body.type ?? "");
  const normalized = normalizeAsaasEvent(event);
  const admin = createAdminClient();

  try {
    if (isPaymentReceivedEvent(normalized)) {
      await handleAsaasPaymentReceived(admin, body);
    } else if (isPaymentOverdueEvent(normalized)) {
      await handleAsaasPaymentOverdue(admin, body);
    }
  } catch (e) {
    console.error("asaas webhook handler", e);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
