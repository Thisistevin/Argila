import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  handleAbacateCheckoutCompleted,
  handleAbacateSubscriptionRenewed,
  handleAbacateSubscriptionCancelled,
  isCheckoutCompletedEvent,
  isSubscriptionRenewedEvent,
  isSubscriptionCancelledEvent,
} from "@/lib/billing/abacatepay-webhook-handlers";

export async function POST(request: NextRequest) {
  const secret = process.env.ABACATEPAY_WEBHOOK_SECRET;
  const provided =
    new URL(request.url).searchParams.get("webhookSecret") ??
    request.headers.get("x-abacate-signature") ??
    request.headers.get("x-webhook-signature");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const event = String(body.event ?? "");
  const admin = createAdminClient();

  try {
    if (isCheckoutCompletedEvent(event)) {
      await handleAbacateCheckoutCompleted(admin, body);
    } else if (isSubscriptionRenewedEvent(event)) {
      await handleAbacateSubscriptionRenewed(admin, body);
    } else if (isSubscriptionCancelledEvent(event)) {
      await handleAbacateSubscriptionCancelled(admin, body);
    }
  } catch (e) {
    console.error("abacatepay webhook handler", e);
    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
