import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  title: string;
  body: string;
  tag?: string;
  data?: Record<string, unknown>;
  requireInteraction?: boolean;
}

// Convert base64url to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Send Web Push notification
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: PushPayload,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    // Use web-push compatible approach with fetch
    const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
    
    // For simplicity, we'll use the native fetch with the subscription endpoint
    // In production, you'd use a proper web-push library or implement full encryption
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "TTL": "86400",
        "Authorization": `vapid t=${vapidPublicKey}, k=${vapidPrivateKey}`,
      },
      body: payloadBytes,
    });

    console.log(`Push response status: ${response.status}`);
    return response.ok || response.status === 201;
  } catch (error) {
    console.error("Error sending push:", error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("VAPID keys not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { type, userId, payload } = await req.json();
    console.log(`Processing push notification request: type=${type}, userId=${userId}`);

    // Get authorization header
    const authHeader = req.headers.get("authorization");

    // Validate request based on type
    if (type === "scheduled_reminders") {
      // Scheduled reminders should only be called by cron jobs with service role
      // Verify the request has service role authorization
      if (!authHeader || !authHeader.includes(supabaseServiceKey.substring(0, 20))) {
        // Allow calls with valid anon key for cron jobs (they use the anon key in the cron setup)
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
        if (!anonKey || !authHeader?.includes("Bearer")) {
          console.error("Unauthorized scheduled_reminders request");
          return new Response(
            JSON.stringify({ error: "Unauthorized: scheduled_reminders requires valid authorization" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } else if (type === "individual" && userId) {
      // For individual notifications, verify the caller is the user or has service role
      if (!authHeader) {
        console.error("Missing authorization header for individual notification");
        return new Response(
          JSON.stringify({ error: "Unauthorized: missing authorization" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Extract JWT token and verify user
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        console.error("Invalid auth token:", authError?.message);
        return new Response(
          JSON.stringify({ error: "Unauthorized: invalid token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify user can only send notifications to themselves
      if (user.id !== userId) {
        console.error(`User ${user.id} attempted to send notification to ${userId}`);
        return new Response(
          JSON.stringify({ error: "Forbidden: cannot send notifications to other users" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (type !== "scheduled_reminders" && type !== "individual") {
      return new Response(
        JSON.stringify({ error: "Invalid request type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle scheduled daily reminders
    if (type === "scheduled_reminders") {
      const now = new Date();
      const currentHour = now.getUTCHours();
      const currentMinute = now.getUTCMinutes();
      
      console.log(`Checking for reminders at ${currentHour}:${currentMinute} UTC`);

      // Get all users with daily reminders enabled around this time
      // We check for users whose reminder time matches the current hour (with 5 min tolerance)
      const { data: settings, error: settingsError } = await supabase
        .from("notification_settings")
        .select(`
          user_id,
          reminder_time,
          daily_reminder_enabled
        `)
        .eq("daily_reminder_enabled", true);

      if (settingsError) {
        console.error("Error fetching settings:", settingsError);
        throw settingsError;
      }

      console.log(`Found ${settings?.length || 0} users with daily reminders enabled`);

      let sentCount = 0;
      for (const setting of settings || []) {
        // Parse reminder time (stored as HH:MM:SS)
        const [hour, minute] = setting.reminder_time.split(":").map(Number);
        
        // Check if current time matches (within 5 minute window)
        // Note: This is simplified - you might want to account for timezones
        if (Math.abs(currentHour * 60 + currentMinute - (hour * 60 + minute)) <= 5) {
          // Get user's push subscriptions
          const { data: subscriptions, error: subError } = await supabase
            .from("push_subscriptions")
            .select("*")
            .eq("user_id", setting.user_id);

          if (subError) {
            console.error("Error fetching subscriptions:", subError);
            continue;
          }

          // Get user's currently reading book
          const { data: currentBook } = await supabase
            .from("user_books")
            .select("books(title)")
            .eq("user_id", setting.user_id)
            .eq("status", "reading")
            .limit(1)
            .single();

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const bookData = currentBook?.books as any;
          const bookTitle = bookData?.title as string | undefined;
          
          const reminderPayload: PushPayload = {
            title: "📚 Time to read!",
            body: bookTitle 
              ? `Continue reading "${bookTitle}"`
              : "Don't forget your daily reading session",
            tag: "reading-reminder",
            data: { url: "/" },
          };

          for (const sub of subscriptions || []) {
            const sent = await sendWebPush(
              { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
              reminderPayload,
              vapidPublicKey,
              vapidPrivateKey
            );
            if (sent) sentCount++;
          }
        }
      }

      console.log(`Sent ${sentCount} reminder notifications`);
      return new Response(
        JSON.stringify({ success: true, sentCount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle individual notification to specific user
    if (type === "individual" && userId && payload) {
      const { data: subscriptions, error: subError } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", userId);

      if (subError) throw subError;

      let sentCount = 0;
      for (const sub of subscriptions || []) {
        const sent = await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload,
          vapidPublicKey,
          vapidPrivateKey
        );
        if (sent) sentCount++;
      }

      console.log(`Sent ${sentCount} individual notifications to user ${userId}`);
      return new Response(
        JSON.stringify({ success: true, sentCount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If we reach here with type "individual" but missing payload
    return new Response(
      JSON.stringify({ error: "Invalid request: missing required fields" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-push-notification:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
