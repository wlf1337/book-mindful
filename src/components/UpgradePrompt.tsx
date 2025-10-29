import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";

export const UpgradePrompt = () => {
  const [loading, setLoading] = useState(false);
  const { subscribed, subscriptionEnd } = useSubscription();

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to start checkout");
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to open portal");
    } finally {
      setLoading(false);
    }
  };

  if (subscribed) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Premium AI Insights Active
              </CardTitle>
              <CardDescription>
                You have full access to all AI features
                {subscriptionEnd && ` until ${new Date(subscriptionEnd).toLocaleDateString()}`}
              </CardDescription>
            </div>
            <Badge variant="default">Premium</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleManageSubscription} 
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              "Manage Subscription"
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Upgrade to Premium AI Insights
        </CardTitle>
        <CardDescription>
          Unlock powerful AI features for your reading notes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-primary" />
            <span>Personalized book summaries</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-primary" />
            <span>Key takeaways extraction</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-primary" />
            <span>Action plan generation</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-primary" />
            <span>Custom AI insights</span>
          </div>
        </div>
        
        <div className="pt-2">
          <div className="text-3xl font-bold mb-2">
            $9.99<span className="text-base font-normal text-muted-foreground">/month</span>
          </div>
          <Button 
            onClick={handleUpgrade} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Upgrade to Premium
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};