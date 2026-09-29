import { NextResponse } from "next/server";
import { createAdminClient, getUser } from "@/lib/supabase/server";
import { razorpayConfigured, verifySignature } from "@/lib/razorpay";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!razorpayConfigured()) return NextResponse.json({ error: "payments_not_configured" }, { status: 500 });

  const body = await request.json().catch(() => ({}));
  const orderId = typeof body.razorpay_order_id === "string" ? body.razorpay_order_id : "";
  const paymentId = typeof body.razorpay_payment_id === "string" ? body.razorpay_payment_id : "";
  const signature = typeof body.razorpay_signature === "string" ? body.razorpay_signature : "";
  if (!orderId || !paymentId || !signature) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (!verifySignature(orderId, paymentId, signature)) {
    await admin
      .from("payments")
      .update({ status: "failed", razorpay_payment_id: paymentId })
      .eq("razorpay_order_id", orderId)
      .eq("user_id", user.id)
      .eq("status", "pending");
    return NextResponse.json({ error: "signature_mismatch" }, { status: 400 });
  }

  // Credit is added only after the signature check, exactly once per order, for the order's owner.
  const { data: ok, error } = await admin.rpc("complete_payment", {
    p_user: user.id,
    p_order_id: orderId,
    p_payment_id: paymentId,
  });
  if (error) {
    console.error("verify: complete_payment failed", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!ok) return NextResponse.json({ error: "order_not_found" }, { status: 400 });

  return NextResponse.json({ success: true });
}
