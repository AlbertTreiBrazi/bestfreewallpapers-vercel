import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Link } from 'react-router-dom'
import { Crown, Check, Loader2, CreditCard, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { SEOHead } from '@/components/seo/SEOHead'

export function UpgradePage() {
  const { user } = useAuth()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const handleSubscribe = async (planType: string, planName: string) => {
    if (!user) {
      toast.error('Please sign in to subscribe')
      return
    }

    setLoadingPlan(planType)

    try {
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: {
          planType: planType,
          customerEmail: user.email
        }
      })

      if (error) throw error

      if (data.data?.checkoutUrl) {
        toast.success(`Redirecting to ${planName} checkout...`)
        window.location.href = data.data.checkoutUrl
      }
    } catch (error: any) {
      console.error('Subscription error:', error)
      toast.error(error.message || 'Failed to create subscription')
    } finally {
      setLoadingPlan(null)
    }
  }

  const allFeatures = [
    'Unlimited wallpaper downloads',
    '8K ultra HD quality',
    'Ad-free browsing',
    'Commercial license',
    'Priority support',
    'Early access to new collections',
    'Cancel anytime'
  ]

  const pricingPlans = [
    {
      id: 'premium',
      name: 'Monthly',
      price: '4.99',
      billingCycle: 'per month',
      description: 'Perfect for trying premium',
      originalPrice: null,
      savings: null,
      badge: null,
      recommended: false,
      features: allFeatures,
      ctaText: 'Subscribe Monthly'
    },
    {
      id: 'sixmonth',
      name: '6 Months',
      price: '24.99',
      billingCycle: 'every 6 months',
      description: 'Most popular choice',
      originalPrice: '29.94',
      savings: 'Save 15%',
      badge: 'Best Value',
      recommended: true,
      features: allFeatures,
      ctaText: 'Get 6 Months'
    },
    {
      id: 'annual',
      name: 'Annual',
      price: '44.99',
      billingCycle: 'per year',
      description: 'Best long-term value',
      originalPrice: '59.88',
      savings: 'Save 25%',
      badge: null,
      recommended: false,
      features: allFeatures,
      ctaText: 'Get Annual Plan'
    }
  ]

  return (
    <>
      <SEOHead
        config={{
          title: "Upgrade to Premium - BestFreeWallpapers",
          description: "Get unlimited 8K wallpapers, ad-free experience, and commercial license. Choose monthly, 6-month, or annual plans with up to 25% savings.",
          keywords: ['premium wallpapers', 'upgrade', 'subscription', '4K wallpapers', '8K wallpapers', 'exclusive wallpapers'],
          type: 'website' as const
        }}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-12 sm:mb-16">
            <Crown className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-6 text-yellow-500" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Upgrade to Premium
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto px-4">
              Get unlimited access to 8K wallpapers, ad-free browsing, and commercial usage rights. Choose the plan that works best for you.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto mb-12">
            {pricingPlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden transition-all duration-200 ${
                  plan.recommended
                    ? 'ring-2 ring-blue-500 transform md:scale-105 md:z-10'
                    : 'hover:shadow-xl'
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-1 text-xs sm:text-sm font-bold rounded-bl-lg">
                    {plan.badge}
                  </div>
                )}

                <div className="p-6 sm:p-8">
                  {/* Plan Name */}
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {plan.name}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {plan.description}
                  </p>

                  {/* Pricing */}
                  <div className="mb-6">
                    <div className="flex items-baseline justify-start space-x-2 mb-1">
                      <span className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                        €{plan.price}
                      </span>
                      {plan.originalPrice && (
                        <span className="text-lg text-gray-400 dark:text-gray-500 line-through">
                          €{plan.originalPrice}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {plan.billingCycle}
                    </p>
                    {plan.savings && (
                      <div className="mt-2 inline-block bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-xs font-semibold">
                        {plan.savings}
                      </div>
                    )}
                  </div>

                  {/* Features List */}
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start space-x-3">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSubscribe(plan.id, plan.name)}
                    disabled={!user || loadingPlan === plan.id}
                    className={`w-full py-3 sm:py-4 min-h-[44px] rounded-lg font-semibold text-sm sm:text-base transition duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      plan.recommended
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                        : 'bg-gray-900 dark:bg-gray-700 text-white hover:bg-gray-800 dark:hover:bg-gray-600'
                    }`}
                  >
                    {loadingPlan === plan.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CreditCard className="w-5 h-5" />
                        <span>
                          {!user ? 'Sign In to Subscribe' : plan.ctaText}
                        </span>
                      </>
                    )}
                  </button>

                  {/* VAT Notice */}
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-3">
                    VAT will be calculated at checkout
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Sign In Prompt */}
          {!user && (
            <div className="text-center mb-8">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Don't have an account?
              </p>
              <Link
                to="/auth"
                className="inline-flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold"
              >
                <span>Sign in or create an account</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {/* Additional Info */}
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              All plans include a 30-day money-back guarantee. Cancel anytime with no questions asked.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Secure payment powered by Stripe. Your payment information is encrypted and secure.
            </p>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-gray-400 dark:text-gray-600">
            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-green-500" />
              <span className="text-sm">Secure Payment</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-green-500" />
              <span className="text-sm">30-Day Guarantee</span>
            </div>
            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-green-500" />
              <span className="text-sm">Cancel Anytime</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default UpgradePage
