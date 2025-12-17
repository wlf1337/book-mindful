import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

// Your VAPID public key - this should match the one in secrets
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

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

export interface NotificationSettings {
  dailyReminderEnabled: boolean;
  reminderTime: string;
  goalNotifications: boolean;
  streakNotifications: boolean;
  completionNotifications: boolean;
}

export const usePushSubscription = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<NotificationSettings>({
    dailyReminderEnabled: false,
    reminderTime: "20:00",
    goalNotifications: true,
    streakNotifications: true,
    completionNotifications: true,
  });

  // Check if user has an existing subscription
  const checkSubscription = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }

      // Check for existing subscription in database
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .limit(1);

      setIsSubscribed((subs?.length || 0) > 0);

      // Load settings from database
      const { data: dbSettings } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (dbSettings) {
        setSettings({
          dailyReminderEnabled: dbSettings.daily_reminder_enabled,
          reminderTime: dbSettings.reminder_time?.substring(0, 5) || "20:00",
          goalNotifications: dbSettings.goal_notifications,
          streakNotifications: dbSettings.streak_notifications,
          completionNotifications: dbSettings.completion_notifications,
        });
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Subscribe to push notifications
  const subscribe = async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      if (!VAPID_PUBLIC_KEY) {
        console.warn("VAPID public key not configured");
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      const subscriptionJson = subscription.toJSON();
      
      // Save to database
      const { error } = await supabase.from("push_subscriptions").upsert({
        user_id: user.id,
        endpoint: subscriptionJson.endpoint!,
        p256dh: subscriptionJson.keys!.p256dh,
        auth: subscriptionJson.keys!.auth,
      }, {
        onConflict: "user_id,endpoint",
      });

      if (error) throw error;

      // Create default notification settings if they don't exist
      await supabase.from("notification_settings").upsert({
        user_id: user.id,
        daily_reminder_enabled: settings.dailyReminderEnabled,
        reminder_time: settings.reminderTime + ":00",
        goal_notifications: settings.goalNotifications,
        streak_notifications: settings.streakNotifications,
        completion_notifications: settings.completionNotifications,
      }, {
        onConflict: "user_id",
      });

      setIsSubscribed(true);
      console.log("Push subscription saved successfully");
      return true;
    } catch (error) {
      console.error("Error subscribing to push:", error);
      return false;
    }
  };

  // Unsubscribe from push notifications
  const unsubscribe = async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get current subscription and unsubscribe
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remove from database
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user.id);

      setIsSubscribed(false);
      return true;
    } catch (error) {
      console.error("Error unsubscribing from push:", error);
      return false;
    }
  };

  // Update notification settings
  const updateSettings = async (newSettings: Partial<NotificationSettings>): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const updatedSettings = { ...settings, ...newSettings };
      
      const { error } = await supabase.from("notification_settings").upsert({
        user_id: user.id,
        daily_reminder_enabled: updatedSettings.dailyReminderEnabled,
        reminder_time: updatedSettings.reminderTime + ":00",
        goal_notifications: updatedSettings.goalNotifications,
        streak_notifications: updatedSettings.streakNotifications,
        completion_notifications: updatedSettings.completionNotifications,
      }, {
        onConflict: "user_id",
      });

      if (error) throw error;

      setSettings(updatedSettings);
      return true;
    } catch (error) {
      console.error("Error updating settings:", error);
      return false;
    }
  };

  return {
    isSubscribed,
    isLoading,
    settings,
    subscribe,
    unsubscribe,
    updateSettings,
    checkSubscription,
  };
};
