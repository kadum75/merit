import express from "express";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Triggering redeploy\nexport function createApp() {
  const app = express();

  const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const isSupabaseConfigured = !!supabaseUrl && !!supabaseServiceKey;
  let supabase: any = null;
  if (isSupabaseConfigured) {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log("Supabase Admin initialized successfully");
  } else {
    console.error("Supabase Admin not configured: missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY || "";
  const isStripeConfigured = !!(
    stripeKey &&
    stripeKey !== "sk_test_placeholder" &&
    !stripeKey.includes("placeholder") &&
    (stripeKey.startsWith("sk_test_") || stripeKey.startsWith("sk_live_"))
  );
  const stripe = isStripeConfigured ? new Stripe(stripeKey) : (null as unknown as Stripe);

  app.get("/api/config", (_req, res) => {
    res.json({ isStripeConfigured, isSupabaseConfigured });
  });

  app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    if (!isStripeConfigured) {
      return res.status(503).json({ error: "Stripe not yet configured", configured: false });
    }
    const sig = req.headers["stripe-signature"] as string;
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || "");
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { uid, planType } = session.metadata || {};
        if (uid && supabase) {
          const isDonation = planType === "donation";
          const updateData: any = {
            stripe_customer_id: session.customer as string,
            last_login_at: new Date().toISOString(),
          };
          if (!isDonation) {
            updateData.is_pro = true;
            updateData.subscription_id = session.subscription as string;
            updateData.subscription_status = "active";
            updateData.plan_type = planType || "monthly";
          } else {
            updateData.plan_type = "donation";
          }
          await supabase.from("users").update(updateData).eq("uid", uid);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        if (supabase) {
          const { data: users } = await supabase
            .from("users")
            .select("id")
            .eq("stripe_customer_id", customerId);
          if (users && users.length > 0) {
            await supabase
              .from("users")
              .update({ is_pro: false, subscription_status: "cancelled" })
              .eq("stripe_customer_id", customerId);
          }
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        if (supabase) {
          await supabase
            .from("users")
            .update({ subscription_status: "past_due" })
            .eq("stripe_customer_id", customerId);
        }
        break;
      }
    }
    res.json({ received: true });
  });

  app.use(express.json());

  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      if (!isStripeConfigured) {
        return res.status(503).json({ error: "Stripe not yet configured", configured: false });
      }
      const { uid, email, priceId, planType } = req.body;
      if (!priceId || !uid || !email) {
        return res.status(400).json({ error: "Missing required fields (priceId, uid, email)" });
      }
      const appUrl = process.env.VITE_APP_URL || process.env.APP_URL || "https://primecv-mu.vercel.app";
      const mode = planType === "donation" ? "payment" as const : "subscription" as const;
      const session = await stripe.checkout.sessions.create({
        customer_email: email,
        line_items: [{ price: priceId, quantity: 1 }],
        mode,
        metadata: { uid, planType },
        success_url: `${appUrl}?checkout_success=true`,
        cancel_url: appUrl,
      });
      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Stripe error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/create-portal-session", async (req, res) => {
    try {
      if (!isStripeConfigured) {
        return res.status(503).json({ error: "Stripe not yet configured", configured: false });
      }
      const { uid } = req.body;
      if (!uid) return res.status(400).json({ error: "UID is required" });
      if (!supabase) {
        return res.status(500).json({ error: "Database not initialized" });
      }
      const { data: userData, error } = await supabase
        .from("users")
        .select("stripe_customer_id")
        .eq("uid", uid)
        .single();
      if (error || !userData) return res.status(404).json({ error: "User not found" });
      const customerId = userData.stripe_customer_id;
      if (!customerId) {
        return res.status(400).json({ error: "Stripe Customer ID not found for this user" });
      }
      const appUrl = process.env.VITE_APP_URL || process.env.APP_URL || "https://primecv-mu.vercel.app";
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: appUrl,
      });
      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Portal error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  return { app, isSupabaseConfigured, isStripeConfigured };
}
