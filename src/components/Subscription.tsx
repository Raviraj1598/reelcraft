import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Sparkles, Zap, Crown } from 'lucide-react';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';
import { creditsService, SubscriptionPlan } from '../services/api/credits';
import { useAuth } from '../contexts/AuthContext';

const iconMap = {
  free: Sparkles,
  starter: Zap,
  pro: Crown,
  enterprise: Crown,
};

const colorMap = {
  free: 'from-gray-600 to-gray-700',
  starter: 'from-purple-600 to-blue-600',
  pro: 'from-yellow-600 to-orange-600',
  enterprise: 'from-green-600 to-emerald-600',
};

export function Subscription() {
  const navigate = useNavigate();
  const { credits, setCredits } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [updatingPlanId, setUpdatingPlanId] = useState<string | null>(null);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const planList = await creditsService.getSubscriptionPlans();
        setPlans(planList);
      } catch (error) {
        console.error('Failed to load subscription plans:', error);
      }
    };

    void loadPlans();
  }, []);

  const currentPlan = useMemo(
    () => plans.find((plan) => plan.tier === credits?.subscriptionTier) || plans[0],
    [credits, plans]
  );

  const handleUpgrade = async (planId: string) => {
    setUpdatingPlanId(planId);
    try {
      const nextCredits = await creditsService.updateSubscription(planId);
      setCredits(nextCredits);
    } catch (error) {
      console.error('Failed to update subscription:', error);
    } finally {
      setUpdatingPlanId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl text-gray-900">Subscription</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg text-gray-900 mb-1">
                Current Plan: {currentPlan?.name || credits?.subscriptionTier || 'Free'}
              </h2>
              <p className="text-sm text-gray-500">
                {credits?.subscriptionRenewalDate
                  ? `Your plan renews on ${new Date(credits.subscriptionRenewalDate).toLocaleDateString()}`
                  : 'Upgrade anytime to unlock more renders.'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl text-gray-900">{credits?.credits ?? 0}</p>
              <p className="text-sm text-gray-500">Credits remaining</p>
            </div>
          </div>

          <div className="mb-2">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full"
                style={{ width: `${Math.min(100, ((credits?.totalCreditsUsed || 0) / Math.max((credits?.totalCreditsUsed || 0) + (credits?.credits || 0), 1)) * 100)}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            {credits?.totalCreditsUsed || 0} credits used overall
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white rounded-xl p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-lg text-sm transition-all ${
                billingCycle === 'monthly' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-lg text-sm transition-all ${
                billingCycle === 'yearly' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs text-green-600">Save 20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {plans.map((plan) => {
            const Icon = iconMap[plan.tier] || Sparkles;
            const isCurrent = plan.tier === credits?.subscriptionTier;

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-xl p-6 shadow-sm border-2 transition-all ${
                  plan.popular ? 'border-purple-600 shadow-lg scale-105' : isCurrent ? 'border-green-500' : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="mb-4">
                    <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      Current Plan
                    </span>
                  </div>
                )}

                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${colorMap[plan.tier] || colorMap.free} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>

                <h3 className="text-xl text-gray-900 mb-2">{plan.name}</h3>

                <div className="mb-4">
                  <span className="text-3xl text-gray-900">
                    {billingCycle === 'yearly' && plan.price > 0 ? `$${Math.round(plan.price * 12 * 0.8)}` : plan.price === 0 ? 'Free' : `$${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-500 text-sm ml-2">
                      /{billingCycle === 'yearly' ? 'year' : plan.interval}
                    </span>
                  )}
                </div>

                <p className="text-sm text-purple-600 mb-6">{plan.credits} credits / month</p>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full h-10 rounded-lg ${
                    plan.popular ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white' : ''
                  }`}
                  variant={plan.popular ? undefined : 'outline'}
                  disabled={isCurrent || updatingPlanId === plan.id}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {isCurrent ? 'Current Plan' : updatingPlanId === plan.id ? 'Updating...' : 'Upgrade'}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-xl mb-1">Need more credits?</h3>
              <p className="text-purple-100 text-sm">Upgrade your plan to add more rendering capacity instantly.</p>
            </div>
            <Button
              variant="outline"
              className="bg-white text-purple-600 hover:bg-purple-50 border-0 h-10 px-6 rounded-lg"
              onClick={() => navigate('/create')}
            >
              Create With Current Plan
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
