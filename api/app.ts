import express from "express";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export function createApp() {
  const app = express();

  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-XSS-Protection", "0");
    next();
  });

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

  async function verifyAuth(req: express.Request): Promise<{ uid: string; email: string } | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);
    if (!token) return null;
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user) return null;
      return { uid: data.user.id, email: data.user.email || "" };
    } catch {
      return null;
    }
  }

  async function checkRateLimit(userId: string, endpoint: string, maxRequests: number = 30, windowMinutes: number = 1): Promise<boolean> {
    if (!supabase) return true; // Allow if DB is down
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000).toISOString();
    try {
      const { data, error } = await supabase
        .from('rate_limits')
        .select('request_count')
        .eq('user_id', userId)
        .eq('endpoint', endpoint)
        .gte('window_start', windowStart)
        .order('window_start', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return true;
      const count = data?.request_count || 0;
      if (count >= maxRequests) return false;
      if (data) {
        await supabase
          .from('rate_limits')
          .update({ request_count: count + 1 })
          .eq('user_id', userId)
          .eq('endpoint', endpoint)
          .eq('window_start', data.window_start);
      } else {
        await supabase
          .from('rate_limits')
          .insert({ user_id: userId, endpoint, request_count: 1, window_start: now.toISOString() });
      }
      return true;
    } catch {
      return true; // Allow on error (fail open)
    }
  }

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

    if (supabase) {
      const { data: existing } = await supabase
        .from('webhook_events')
        .select('id')
        .eq('event_id', event.id)
        .maybeSingle();
      if (existing) {
        return res.json({ received: true, idempotent: true });
      }
      await supabase
        .from('webhook_events')
        .insert({ event_id: event.id, event_type: event.type })
        .catch(() => {});
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
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const status = subscription.status;
        if (supabase) {
          const dbStatus = status === "active" || status === "trialing" ? "active" : status;
          await supabase
            .from("users")
            .update({
              subscription_status: dbStatus,
              is_pro: dbStatus === "active",
            })
            .eq("stripe_customer_id", customerId);
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
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        if (supabase && (invoice as any).subscription) {
          await supabase
            .from("users")
            .update({ subscription_status: "active" })
            .eq("stripe_customer_id", customerId);
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
      case "checkout.session.async_payment_succeeded": {
        const asyncSession = event.data.object as Stripe.Checkout.Session;
        const { uid: asyncUid, planType: asyncPlanType } = asyncSession.metadata || {};
        if (asyncUid && supabase) {
          await supabase.from("users").update({
            stripe_customer_id: asyncSession.customer as string,
            is_pro: true,
            subscription_id: asyncSession.subscription as string,
            subscription_status: "active",
            plan_type: asyncPlanType || "monthly",
          }).eq("uid", asyncUid);
        }
        break;
      }
      case "checkout.session.async_payment_failed": {
        const failedSession = event.data.object as Stripe.Checkout.Session;
        const { uid: failedUid } = failedSession.metadata || {};
        if (failedUid && supabase) {
          await supabase.from("users").update({
            subscription_status: "payment_failed",
          }).eq("uid", failedUid);
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

      const user = await verifyAuth(req);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized: valid session required" });
      }

      if (!(await checkRateLimit(user.uid, 'create-checkout-session', 10, 1))) {
        return res.status(429).json({ error: "Too many requests. Please wait before trying again." });
      }

      const { uid, email, priceId, planType, returnView, donationAmount } = req.body;
      if (!uid || !email) {
        return res.status(400).json({ error: "Missing required fields (uid, email)" });
      }

      if (uid !== user.uid || email !== user.email) {
        return res.status(403).json({ error: "Forbidden: uid/email does not match authenticated user" });
      }

      // Custom amount donations — skip price ID check, create on-the-fly price
      if (planType === "donation" && donationAmount) {
        const amount = parseInt(donationAmount);
        if (isNaN(amount) || amount < 1 || amount > 1000) {
          return res.status(400).json({ error: "Donation amount must be between £1 and £1,000" });
        }
        const appUrl = process.env.VITE_APP_URL || process.env.APP_URL || "https://merit-cv.vercel.app";
        const viewParam = returnView === 'builder' ? '&view=builder' : '';
        const session = await stripe.checkout.sessions.create({
          customer_email: email,
          line_items: [{
            price_data: {
              currency: 'gbp',
              product_data: { name: 'Donation to Merit' },
              unit_amount: amount * 100,
            },
            quantity: 1,
          }],
          mode: 'payment',
          metadata: { uid, planType, donation_amount: String(amount) },
          success_url: `${appUrl}?checkout_success=true${viewParam}`,
          cancel_url: `${appUrl}?view=${returnView || 'home'}`,
        });
        return res.json({ url: session.url });
      }

      if (!priceId) {
        return res.status(400).json({ error: "Missing required field (priceId)" });
      }

      const ALLOWED_PRICE_IDS = [
        process.env.VITE_STRIPE_MONTHLY_PRICE_ID,
        process.env.VITE_STRIPE_ANNUAL_PRICE_ID,
        process.env.VITE_STRIPE_ORG_PRICE_ID,
        process.env.VITE_STRIPE_DONATION_PRICE_ID,
      ].filter(Boolean);
      if (!ALLOWED_PRICE_IDS.includes(priceId)) {
        return res.status(400).json({ error: "Invalid price ID" });
      }

      const appUrl = process.env.VITE_APP_URL || process.env.APP_URL || "https://merit-cv.vercel.app";
      const viewParam = returnView === 'builder' ? '&view=builder' : '';
      const mode = planType === "donation" ? "payment" as const : "subscription" as const;
      const session = await stripe.checkout.sessions.create({
        customer_email: email,
        line_items: [{ price: priceId, quantity: 1 }],
        mode,
        metadata: { uid, planType },
        success_url: `${appUrl}?checkout_success=true${viewParam}`,
        cancel_url: `${appUrl}?view=${returnView || 'home'}`,
      });
      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Stripe error:", error);
      res.status(500).json({ error: "An unexpected error occurred. Please try again." });
    }
  });

  app.post("/api/create-portal-session", async (req, res) => {
    try {
      if (!isStripeConfigured) {
        return res.status(503).json({ error: "Stripe not yet configured", configured: false });
      }

      const user = await verifyAuth(req);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized: valid session required" });
      }

      if (!(await checkRateLimit(user.uid, 'create-portal-session', 10, 1))) {
        return res.status(429).json({ error: "Too many requests. Please wait before trying again." });
      }

      const { uid } = req.body;
      if (!uid) return res.status(400).json({ error: "UID is required" });

      if (uid !== user.uid) {
        return res.status(403).json({ error: "Forbidden: uid does not match authenticated user" });
      }

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
      const appUrl = process.env.VITE_APP_URL || process.env.APP_URL || "https://merit-cv.vercel.app";
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: appUrl,
      });
      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Portal error:", error);
      res.status(500).json({ error: "An unexpected error occurred. Please try again." });
    }
  });

  app.post("/api/increment-preview", async (req, res) => {
    try {
      const user = await verifyAuth(req);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!supabase) {
        return res.status(500).json({ error: "Database not initialized" });
      }

      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: userData } = await supabase
        .from("users")
        .select("preview_count, last_preview_reset, is_pro")
        .eq("uid", user.uid)
        .single();

      if (userData?.is_pro) {
        return res.json({ allowed: true, remaining: -1 });
      }

      let count = userData?.preview_count || 0;
      let reset = userData?.last_preview_reset || "";

      if (reset !== currentMonth) {
        count = 0;
        reset = currentMonth;
      }

      if (count >= 3) {
        return res.json({ allowed: false, remaining: 0 });
      }

      await supabase
        .from("users")
        .update({ preview_count: count + 1, last_preview_reset: currentMonth })
        .eq("uid", user.uid);

      res.json({ allowed: true, remaining: 2 - count });
    } catch (err) {
      console.error("Preview count error:", err);
      res.status(500).json({ error: "Failed to validate preview count" });
    }
  });

  return { app, isSupabaseConfigured, isStripeConfigured };
}
