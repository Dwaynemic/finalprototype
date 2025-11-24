// Load .env from the SAME folder
import "jsr:@std/dotenv/load";

import { Hono } from "jsr:@hono/hono";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !supabaseKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment.");
}

const supabase = createClient(supabaseUrl, supabaseKey);


// Hono app
const app = new Hono();

// GET route
app.get("/send-reminders", async (c) => {
  try {
    const now = Date.now();

    // Get all appointments
    const { data: rows, error: errApt } = await supabase
      .from("kv_store_8a3943bb")
      .select("value")
      .like("key", "appointment:%");

    if (errApt) throw errApt;

    const appointments = rows?.map((r) => r.value) ?? [];

    // Filter upcoming
    const upcoming = appointments.filter((apt: any) => {
      if (apt.status === "cancelled") return false;
      const aptTime = new Date(apt.dateTime).getTime();
      const daysUntil = Math.ceil((aptTime - now) / (1000 * 60 * 60 * 24));
      return [7, 3, 0].includes(daysUntil);
    });

    for (const apt of upcoming) {
      // Fetch pet info
      const { data: petRow } = await supabase
        .from("kv_store_8a3943bb")
        .select("value")
        .eq("key", apt.petId)
        .maybeSingle();

      const pet = petRow?.value ?? null;

      // Fetch user info
      const { data: userRow } = await supabase
        .from("kv_store_8a3943bb")
        .select("value")
        .eq("key", `user:${apt.userId}`)
        .maybeSingle();

      const ownerProfile = userRow?.value ?? null;

      // Message
      const msg = `Reminder: ${
        pet?.name ?? "Your pet"
      } has an appointment on ${new Date(apt.dateTime).toLocaleString()}.`;

      console.log("Sending reminder to:", ownerProfile?.email, msg);

      // SENDGRID
      const sgKey = Deno.env.get("SENDGRID_API_KEY");
      if (sgKey && ownerProfile?.email) {
        await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${sgKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: ownerProfile.email }] }],
            from: { email: "no-reply@pet-house.example" },
            subject: "Appointment reminder",
            content: [{ type: "text/plain", value: msg }],
          }),
        }).catch((e) => console.error("SendGrid error:", e));
      }

      // TWILIO
      const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const token = Deno.env.get("TWILIO_AUTH_TOKEN");
      const from = Deno.env.get("TWILIO_FROM_NUMBER");

      if (sid && token && from && ownerProfile?.phone) {
        const body = new URLSearchParams({
          To: ownerProfile.phone,
          From: from,
          Body: msg,
        });

        await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: body.toString(),
          }
        ).catch((e) => console.error("Twilio error:", e));
      }
    }

    return c.json({ sent: upcoming.length });
  } catch (error) {
    console.error("Send reminders error:", error);
    return c.json({ error: "Failed to send reminders" }, 500);
  }
});

// Deno entrypoint
if (import.meta.main) {
  Deno.serve(app.fetch);
}
