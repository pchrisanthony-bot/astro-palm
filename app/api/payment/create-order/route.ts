import { NextResponse } from "next/server";
import { createAdminClient, getUser } from "@/lib/supabase/server";
import { razorpay, razorpayConfigured } from "@/lib/razorpay";
import { PRICE_PAISE } from "@/types";

export const runtime = "nodejs";

export async function POST() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!razorpayConfigured()) return NextResponse.json({ error: "payments_not_configured" }, { status: 500 });

  try {
    // Amount is fixed server-side; the client never chooses the price.
    const order = await razorpay().orders.create({
      amount: PRICE_PAISE,
      currency: "INR",
      receipt: `ap_${Date.now()}`,
      notes: { user_id: user.id },
    });

    const { error } = await createAdminClient().from("payments").insert({
      user_id: user.id,
      razorpay_order_id: order.id,
      amount_paise: PRICE_PAISE,
      status: "pending",
    });
    if (error) throw error;

    return NextResponse.json({
      order_id: order.id,
      amount: PRICE_PAISE,
      currency: "INR",
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("create-order failed", err);
    return NextResponse.json({ error: "order_failed" }, { status: 500 });
  }
}
