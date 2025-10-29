import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface SubscriptionContextType {
  subscribed: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
  checkSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return context;
};

const PREMIUM_PRODUCT_ID = 'prod_TKDAJwSj3E38al';

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const [subscribed, setSubscribed] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const checkSubscription = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSubscribed(false);
        setProductId(null);
        setSubscriptionEnd(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription');

      if (error) throw error;

      setSubscribed(data.subscribed || false);
      setProductId(data.product_id || null);
      setSubscriptionEnd(data.subscription_end || null);
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscribed(false);
      setProductId(null);
      setSubscriptionEnd(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        
        // Defer subscription check
        if (session?.user) {
          setTimeout(() => {
            checkSubscription();
          }, 0);
        } else {
          setSubscribed(false);
          setProductId(null);
          setSubscriptionEnd(null);
          setLoading(false);
        }
      }
    );

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkSubscription();
      } else {
        setLoading(false);
      }
    });

    // Set up periodic check every minute
    const interval = setInterval(() => {
      if (user) {
        checkSubscription();
      }
    }, 60000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [user]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscribed: subscribed && productId === PREMIUM_PRODUCT_ID,
        productId,
        subscriptionEnd,
        loading,
        checkSubscription
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};