import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotifications } from "@/hooks/useNotifications";
import { notificationTemplates } from "@/lib/notifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, BellOff, Check, AlertCircle, Smartphone } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Notifications = () => {
  const { isSupported, permission, isGranted, isRequesting, requestPermission, sendNotification } = useNotifications();
  const [settings, setSettings] = useState({
    dailyReminder: false,
    reminderTime: "20:00",
    goalNotifications: true,
    streakNotifications: true,
    completionNotifications: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // In a real app, you'd fetch these from a database
      // For now, we'll use localStorage
      const saved = localStorage.getItem(`notification-settings-${user.id}`);
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Failed to load notification settings:", error);
    }
  };

  const saveSettings = async (newSettings: typeof settings) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      localStorage.setItem(`notification-settings-${user.id}`, JSON.stringify(newSettings));
      setSettings(newSettings);
      toast.success("Settings saved");
    } catch (error) {
      toast.error("Failed to save settings");
    }
  };

  const handleRequestPermission = async () => {
    try {
      const result = await requestPermission();
      if (result === "granted") {
        toast.success("Notifications enabled!");
      } else if (result === "denied") {
        toast.error("Notifications were denied. Please enable them in your browser settings.");
      }
    } catch (error) {
      toast.error("Failed to request notification permission");
    }
  };

  const handleTestNotification = async () => {
    setLoading(true);
    try {
      await sendNotification(
        "Test Notification",
        {
          body: "This is a test notification from PagePace!",
          tag: "test",
        }
      );
      toast.success("Test notification sent!");
    } catch (error) {
      toast.error("Failed to send test notification");
    } finally {
      setLoading(false);
    }
  };

  const renderPermissionCard = () => {
    if (!isSupported) {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Notifications are not supported in this browser. Try using Chrome, Firefox, or Safari.
          </AlertDescription>
        </Alert>
      );
    }

    if (!isGranted) {
      return (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Enable Notifications</CardTitle>
                <CardDescription>
                  Get reminders to read and celebrate your achievements
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {permission === "denied" ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Notifications are blocked. To enable them:
                  <ul className="list-disc ml-5 mt-2 space-y-1 text-sm">
                    <li>Click the lock icon in your browser's address bar</li>
                    <li>Find "Notifications" and change to "Allow"</li>
                    <li>Refresh this page</li>
                  </ul>
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  PagePace can send you helpful reminders and notifications to keep you motivated on your reading journey.
                </p>
                <Button 
                  onClick={handleRequestPermission} 
                  disabled={isRequesting}
                  size="lg"
                  className="w-full"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  {isRequesting ? "Requesting..." : "Enable Notifications"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-full">
                <Check className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <CardTitle>Notifications Enabled</CardTitle>
                <CardDescription>You'll receive notifications from PagePace</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleTestNotification} 
            variant="outline"
            disabled={loading}
            className="w-full"
          >
            <Bell className="h-4 w-4 mr-2" />
            {loading ? "Sending..." : "Send Test Notification"}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen gradient-warm">
      <Navbar />
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Notifications</h1>
          <p className="text-muted-foreground">Manage your notification preferences</p>
        </div>

        {renderPermissionCard()}

        {isGranted && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Daily Reading Reminder</CardTitle>
                <CardDescription>Get a daily reminder to read at your chosen time</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="daily-reminder" className="text-base">Enable daily reminder</Label>
                  <Switch
                    id="daily-reminder"
                    checked={settings.dailyReminder}
                    onCheckedChange={(checked) => saveSettings({ ...settings, dailyReminder: checked })}
                  />
                </div>
                {settings.dailyReminder && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reminder-time">Quick select</Label>
                      <Select 
                        value={settings.reminderTime} 
                        onValueChange={(value) => saveSettings({ ...settings, reminderTime: value })}
                      >
                        <SelectTrigger id="reminder-time">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="08:00">8:00 AM</SelectItem>
                          <SelectItem value="12:00">12:00 PM</SelectItem>
                          <SelectItem value="18:00">6:00 PM</SelectItem>
                          <SelectItem value="20:00">8:00 PM</SelectItem>
                          <SelectItem value="21:00">9:00 PM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="custom-time">Or set custom time</Label>
                      <Input
                        id="custom-time"
                        type="time"
                        value={settings.reminderTime}
                        onChange={(e) => saveSettings({ ...settings, reminderTime: e.target.value })}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity Notifications</CardTitle>
                <CardDescription>Choose which types of notifications you want to receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="goal-notifs" className="text-base">Goal achievements</Label>
                    <p className="text-sm text-muted-foreground">When you reach your reading goals</p>
                  </div>
                  <Switch
                    id="goal-notifs"
                    checked={settings.goalNotifications}
                    onCheckedChange={(checked) => saveSettings({ ...settings, goalNotifications: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="streak-notifs" className="text-base">Reading streaks</Label>
                    <p className="text-sm text-muted-foreground">Celebrate your reading streaks</p>
                  </div>
                  <Switch
                    id="streak-notifs"
                    checked={settings.streakNotifications}
                    onCheckedChange={(checked) => saveSettings({ ...settings, streakNotifications: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="completion-notifs" className="text-base">Book completions</Label>
                    <p className="text-sm text-muted-foreground">When you finish a book</p>
                  </div>
                  <Switch
                    id="completion-notifs"
                    checked={settings.completionNotifications}
                    onCheckedChange={(checked) => saveSettings({ ...settings, completionNotifications: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertDescription>
                <strong>💡 Tip:</strong> Visit the <a href="/setup" className="text-primary underline font-medium">App Setup</a> page for a step-by-step guide to install PagePace and configure notifications properly.
              </AlertDescription>
            </Alert>
          </>
        )}
      </main>
    </div>
  );
};

export default Notifications;
