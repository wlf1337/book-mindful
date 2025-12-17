import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { toast } from "sonner";
import { 
  Check, 
  Circle, 
  Download, 
  Bell, 
  Smartphone, 
  Shield,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  Info
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface SetupStep {
  id: string;
  title: string;
  description: string;
  isComplete: boolean;
  action?: () => void;
  actionLabel?: string;
  isLoading?: boolean;
  instructions?: string[];
  platform?: "ios" | "android" | "all";
}

const AppSetup = () => {
  const { isSupported, permission, isGranted, requestPermission } = useNotifications();
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform("ios");
    } else if (/android/.test(userAgent)) {
      setPlatform("android");
    } else {
      setPlatform("desktop");
    }

    // Check if app is installed (running in standalone mode)
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // Listen for the beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        toast.success("App installed successfully!");
      }
      setDeferredPrompt(null);
    }
  };

  const handleRequestNotifications = async () => {
    setIsRequesting(true);
    try {
      const result = await requestPermission();
      if (result === "granted") {
        toast.success("Notifications enabled!");
      } else if (result === "denied") {
        toast.error("Notifications blocked. Check browser settings.");
      }
    } catch (error) {
      toast.error("Failed to request permission");
    } finally {
      setIsRequesting(false);
    }
  };

  const getInstallInstructions = () => {
    if (platform === "ios") {
      return [
        "1. Tap the Share button (square with arrow) at the bottom of Safari",
        "2. Scroll down and tap 'Add to Home Screen'",
        "3. Tap 'Add' in the top right corner",
        "4. The app icon will appear on your home screen"
      ];
    } else if (platform === "android") {
      return [
        "1. Tap the menu (three dots) in your browser",
        "2. Tap 'Add to Home Screen' or 'Install App'",
        "3. Tap 'Add' or 'Install' to confirm",
        "4. The app icon will appear on your home screen"
      ];
    } else {
      return [
        "1. Look for the install icon in your browser's address bar",
        "2. Or click the menu and select 'Install Quietly'",
        "3. Confirm the installation",
        "4. The app will open in its own window"
      ];
    }
  };

  const getNotificationInstructions = () => {
    if (platform === "ios") {
      return [
        "⚠️ iOS has limited PWA notification support",
        "1. Make sure Quietly is installed to your home screen",
        "2. Open the app FROM the home screen icon (not Safari)",
        "3. Tap 'Enable Notifications' below",
        "4. Tap 'Allow' when prompted",
        "",
        "Note: On iOS, notifications only work when the app is installed as a PWA and opened from the home screen."
      ];
    } else if (platform === "android") {
      return [
        "1. Tap 'Enable Notifications' below",
        "2. Tap 'Allow' when prompted",
        "3. For best results, install the app to your home screen"
      ];
    } else {
      return [
        "1. Click 'Enable Notifications' below",
        "2. Click 'Allow' in the browser prompt",
        "3. You can change this later in browser settings"
      ];
    }
  };

  const steps: SetupStep[] = [
    {
      id: "install",
      title: "Install Quietly",
      description: isInstalled 
        ? "App is installed on your device" 
        : "Add Quietly to your home screen for the best experience",
      isComplete: isInstalled,
      action: deferredPrompt ? handleInstallClick : undefined,
      actionLabel: "Install App",
      instructions: getInstallInstructions(),
    },
    {
      id: "notifications",
      title: "Enable Notifications",
      description: isGranted 
        ? "Notifications are enabled" 
        : "Get reading reminders and achievement alerts",
      isComplete: isGranted,
      action: !isGranted && isSupported ? handleRequestNotifications : undefined,
      actionLabel: "Enable Notifications",
      isLoading: isRequesting,
      instructions: getNotificationInstructions(),
    },
  ];

  const completedSteps = steps.filter(s => s.isComplete).length;
  const progress = Math.round((completedSteps / steps.length) * 100);

  return (
    <div className="min-h-screen gradient-warm">
      <Navbar />
      <main className="container mx-auto px-4 py-8 space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold mb-2">App Setup</h1>
          <p className="text-muted-foreground">
            Complete these steps to get the best experience with Quietly
          </p>
        </div>

        {/* Progress indicator */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Setup Progress</span>
              <span className="text-sm text-muted-foreground">{completedSteps} of {steps.length} complete</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            {progress === 100 && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                <Check className="h-4 w-4" />
                All set! You're ready to use Quietly
              </p>
            )}
          </CardContent>
        </Card>

        {/* Platform badge */}
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Detected platform:</span>
          <Badge variant="secondary">
            {platform === "ios" ? "iPhone/iPad" : platform === "android" ? "Android" : "Desktop"}
          </Badge>
        </div>

        {/* Setup steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <Card key={step.id} className={step.isComplete ? "border-green-500/30 bg-green-500/5" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 rounded-full p-1 ${step.isComplete ? "bg-green-500" : "bg-muted"}`}>
                    {step.isComplete ? (
                      <Check className="h-4 w-4 text-white" />
                    ) : (
                      <span className="flex h-4 w-4 items-center justify-center text-xs font-bold text-muted-foreground">
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {step.id === "install" && <Download className="h-5 w-5" />}
                      {step.id === "notifications" && <Bell className="h-5 w-5" />}
                      {step.title}
                    </CardTitle>
                    <CardDescription className="mt-1">{step.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {!step.isComplete && step.instructions && (
                  <div className="bg-muted/50 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
                      <Info className="h-4 w-4" />
                      How to {step.title.toLowerCase()}:
                    </h4>
                    <ul className="space-y-1">
                      {step.instructions.map((instruction, i) => (
                        <li key={i} className="text-sm text-muted-foreground">
                          {instruction}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {step.action && (
                  <Button 
                    onClick={step.action} 
                    disabled={step.isLoading}
                    className="w-full"
                  >
                    {step.isLoading ? "Please wait..." : step.actionLabel}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}

                {step.id === "install" && !isInstalled && !deferredPrompt && (
                  <p className="text-sm text-muted-foreground text-center">
                    Follow the manual steps above to install
                  </p>
                )}

                {step.id === "notifications" && permission === "denied" && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Notifications Blocked</AlertTitle>
                    <AlertDescription>
                      You previously blocked notifications. To enable them:
                      <ul className="list-disc ml-5 mt-2 space-y-1 text-sm">
                        {platform === "ios" ? (
                          <>
                            <li>Go to Settings → Quietly → Notifications</li>
                            <li>Enable "Allow Notifications"</li>
                          </>
                        ) : (
                          <>
                            <li>Click the lock/info icon in your browser's address bar</li>
                            <li>Find "Notifications" and change to "Allow"</li>
                            <li>Refresh this page</li>
                          </>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        {/* Important information about notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Server-Side Push Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              <strong>Quietly supports true push notifications!</strong> Your daily reading reminders will be delivered even when the app is closed.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Daily reminders</strong> are sent from our server at your chosen time</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Works offline</strong> - notifications arrive even if you haven't opened the app</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span><strong>Personalized</strong> - includes the title of your current book</span>
              </li>
            </ul>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Setup:</strong> Go to <a href="/notifications" className="text-primary underline font-medium">Notifications settings</a> to enable push notifications and set your daily reminder time.
              </AlertDescription>
            </Alert>

            {platform === "ios" && (
              <Alert>
                <Smartphone className="h-4 w-4" />
                <AlertTitle>iOS Requirements</AlertTitle>
                <AlertDescription>
                  On iPhone/iPad, push notifications require:
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li>iOS 16.4 or later</li>
                    <li>App must be installed to home screen first</li>
                    <li>Enable notifications from the app (not Safari)</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Quick tips */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Tips for Best Experience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-1.5">
                  <Download className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Install to home screen</p>
                  <p className="text-sm text-muted-foreground">
                    The app loads faster and works offline when installed
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-1.5">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Keep the app open</p>
                  <p className="text-sm text-muted-foreground">
                    In-app reminders work while Quietly is running in the background
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-1.5">
                  <Smartphone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Set a phone reminder</p>
                  <p className="text-sm text-muted-foreground">
                    Use your phone's built-in reminders to open Quietly daily
                  </p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground py-4">
          <p>Need help? Visit the <a href="/notifications" className="text-primary underline">Notifications settings</a> for more options.</p>
        </div>
      </main>
    </div>
  );
};

export default AppSetup;
