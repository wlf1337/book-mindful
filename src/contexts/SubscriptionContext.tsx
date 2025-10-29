import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
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
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes instead of 1

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const [subscribed, setSubscribed] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  
  const isCheckingRef = useRef(false);
  const lastCheckTimeRef = useRef<number>(0);

  const checkSubscription = async () => {
    // Prevent concurrent calls
    if (isCheckingRef.current) {
      return;
    }

    // Use cache if recent check
    const now = Date.now();
    if (now - lastCheckTimeRef.current < CACHE_DURATION) {
      return;
    }

    isCheckingRef.current = true;

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
      lastCheckTimeRef.current = now;
    } catch (error: any) {
      console.error('Error checking subscription:', error);
      
      // Don't clear subscription on rate limit - keep cached value
      if (!error.message?.includes('rate limit')) {
        setSubscribed(false);
        setProductId(null);
        setSubscriptionEnd(null);
      }
    } finally {
      setLoading(false);
      isCheckingRef.current = false;
    }
  };

  useEffect(() => {
    let mounted = true;
    let checkInterval: NodeJS.Timeout | null = null;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Only check on sign in, not on every auth change
          if (event === 'SIGNED_IN') {
            await checkSubscription();
          }
        } else {
          setSubscribed(false);
          setProductId(null);
          setSubscriptionEnd(null);
          setLoading(false);
          lastCheckTimeRef.current = 0;
        }
      }
    );

    // Initial check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      
      setUser(session?.user ?? null);
      if (session?.user) {
        await checkSubscription();
        
        // Set up periodic check only after initial check
        checkInterval = setInterval(() => {
          if (mounted && session?.user) {
            checkSubscription();
          }
        }, CHECK_INTERVAL);
      } else {
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, []); // Empty dependency array - only run once

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