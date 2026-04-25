import { apiFetch } from '../../lib/apiClient';

export interface UserCredits {
  userId: string;
  credits: number;
  subscriptionTier: 'free' | 'starter' | 'pro' | 'enterprise';
  subscriptionStatus: 'active' | 'inactive' | 'cancelled' | 'expired';
  subscriptionRenewalDate?: string;
  totalCreditsUsed: number;
  totalVideosGenerated: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'purchase' | 'subscription' | 'usage' | 'bonus' | 'refund';
  description: string;
  relatedProjectId?: string;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: UserCredits['subscriptionTier'];
  price: number;
  currency: string;
  interval: 'month' | 'year';
  credits: number;
  features: string[];
  popular?: boolean;
}

class CreditsService {
  getUserCredits(_userId?: string): Promise<UserCredits> {
    return apiFetch<UserCredits>('/api/credits');
  }

  getTransactionHistory(_userId?: string, limit: number = 50): Promise<CreditTransaction[]> {
    return apiFetch<CreditTransaction[]>(`/api/credits/transactions?limit=${limit}`);
  }

  getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    return apiFetch<SubscriptionPlan[]>('/api/subscription/plans');
  }

  updateSubscription(planId: string): Promise<UserCredits> {
    return apiFetch<UserCredits>('/api/subscription', {
      method: 'POST',
      body: { planId },
    });
  }
}

export const creditsService = new CreditsService();
