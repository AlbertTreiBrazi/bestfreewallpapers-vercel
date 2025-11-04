import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabase'
import { Crown, Upload, DollarSign, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface PremiumRequest {
  id: number
  plan_type: string
  duration_months: number
  amount_paid: number
  payment_method: string
  payment_proof_url: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  admin_notes: string
}

export function PremiumRequestModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { user, profile } = useAuth()
  const { theme } = useTheme()
  const [loading, setLoading] = useState(false)
  const [userRequests, setUserRequests] = useState<PremiumRequest[]>([])
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [submitMessage, setSubmitMessage] = useState('')
  const [formData, setFormData] = useState({
    plan_type: 'premium',
    duration_months: 1,
    payment_method: 'bank_transfer',
    amount_paid: 0,
    payment_proof_url: ''
  })

  const pricingPlans = {
    1: { months: 1, price: 9.99, discount: 0 },
    6: { months: 6, price: 49.99, discount: 17 },
    12: { months: 12, price: 79.99, discount: 33 }
  }

  useEffect(() => {
    if (isOpen && user) {
      loadUserRequests()
    }
  }, [isOpen, user])

  const loadUserRequests = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('premium-request', {
        method: 'GET'
      })

      if (error) throw error
      setUserRequests(data.data || [])
    } catch (error: any) {
      console.error('Error loading requests:', error)
    }
  }

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSubmitStatus('idle')
    setSubmitMessage('')

    try {
      const requestData = {
        ...formData,
        email: user?.email || '',
        full_name: profile?.full_name || ''
      }

      const { data, error } = await supabase.functions.invoke('premium-request', {
        method: 'POST',
        body: requestData
      })

      if (error) throw error

      // Enhanced success feedback
      setSubmitStatus('success')
      setSubmitMessage(`Premium request submitted successfully! Request ID: ${data.data?.id || 'Generated'}. You will be notified once processed.`)
      toast.success('Premium request submitted successfully!')
      loadUserRequests()
      
      // Reset form
      setFormData({
        plan_type: 'premium',
        duration_months: 1,
        payment_method: 'bank_transfer',
        amount_paid: 0,
        payment_proof_url: ''
      })

      // Auto-clear success message after 10 seconds
      setTimeout(() => {
        setSubmitStatus('idle')
        setSubmitMessage('')
      }, 10000)

    } catch (error: any) {
      console.error('Error submitting request:', error)
      setSubmitStatus('error')
      setSubmitMessage(`Failed to submit premium request: ${error.message || 'Please try again.'}`) 
      toast.error(error.message || 'Failed to submit premium request')
      
      // Auto-clear error message after 8 seconds
      setTimeout(() => {
        setSubmitStatus('idle')
        setSubmitMessage('')
      }, 8000)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-theme-surface border border-theme-light rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl ${theme}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-theme-light">
          <div className="flex items-center space-x-2">
            <Crown className="w-6 h-6 text-yellow-500" />
            <h2 className="text-2xl font-bold text-theme-primary">Premium Membership Request</h2>
          </div>
          <button
            onClick={onClose}
            className="text-theme-tertiary hover:text-theme-secondary transition-colors text-2xl font-light rounded-full w-10 h-10 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Request Form */}
          <div>
            <h3 className="text-xl font-semibold mb-6 text-theme-primary">Submit New Request</h3>
            
            {/* Pricing Plans */}
            <div className="mb-6">
              <h4 className="font-medium text-theme-primary mb-3">Choose Your Plan</h4>
              <div className="grid grid-cols-1 gap-3">
                {Object.entries(pricingPlans).map(([months, plan]) => (
                  <div
                    key={months}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      formData.duration_months === plan.months
                        ? 'border-gray-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-theme-light hover:border-theme-light bg-theme-surface'
                    }`}
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        duration_months: plan.months,
                        amount_paid: plan.price
                      }))
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-theme-primary">{plan.months} {plan.months === 1 ? 'Month' : 'Months'}</div>
                        {plan.discount > 0 && (
                          <div className="text-sm text-green-600">{plan.discount}% OFF</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-theme-primary">${plan.price}</div>
                        <div className="text-sm text-theme-secondary">${(plan.price / plan.months).toFixed(2)}/month</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              {/* Enhanced Feedback Panel */}
              {submitStatus !== 'idle' && (
                <div className={`p-4 rounded-lg mb-4 ${
                  submitStatus === 'success' 
                    ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-700' 
                    : 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-700'
                }`}>
                  <div className="flex items-start">
                    {submitStatus === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                    )}
                    <div>
                      <h4 className={`font-semibold ${
                        submitStatus === 'success' ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'
                      }`}>
                        {submitStatus === 'success' ? 'Request Submitted Successfully!' : 'Submission Failed'}
                      </h4>
                      <p className={`text-sm mt-1 ${
                        submitStatus === 'success' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                      }`}>
                        {submitMessage}
                      </p>
                      {submitStatus === 'success' && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                          You can close this modal or submit another request. Check "Your Requests" section for status updates.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Payment Method
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="w-full p-3 bg-theme-surface border border-theme-light text-theme-primary rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="paypal">PayPal</option>
                  <option value="crypto">Cryptocurrency</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Payment Instructions */}
              <div className="bg-theme-secondary border border-theme-light p-4 rounded-lg">
                <h4 className="font-medium text-theme-primary mb-2">Payment Instructions</h4>
                <div className="text-sm text-theme-secondary space-y-1">
                  {formData.payment_method === 'bank_transfer' && (
                    <>
                      <p><strong>Bank:</strong> ABC Bank</p>
                      <p><strong>Account:</strong> 1234567890</p>
                      <p><strong>Routing:</strong> 123456789</p>
                    </>
                  )}
                  {formData.payment_method === 'paypal' && (
                    <p><strong>PayPal:</strong> payments@bestfreewallpapers.com</p>
                  )}
                  {formData.payment_method === 'crypto' && (
                    <>
                      <p><strong>Bitcoin:</strong> 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa</p>
                      <p><strong>Ethereum:</strong> 0x742d35Cc6434C0532925a3b8a6a5F0d4b0b1Ba1A</p>
                    </>
                  )}
                  <p className="pt-2"><strong>Amount:</strong> ${formData.amount_paid}</p>
                </div>
              </div>

              {/* Payment Proof Upload */}
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Payment Proof (Screenshot/Receipt URL)
                </label>
                <input
                  type="url"
                  value={formData.payment_proof_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_proof_url: e.target.value }))}
                  placeholder="https://example.com/payment-screenshot.jpg"
                  className="form-input w-full p-3 border rounded-lg focus:ring-2"
                  required
                />
                <p className="text-xs text-theme-muted mt-1">
                  Upload your payment proof to a service like Imgur, Google Drive, or Dropbox and paste the public link here.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 px-4 rounded-lg font-semibold transition duration-200 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : `Submit Request ($${formData.amount_paid})`}
              </button>
            </form>
          </div>

          {/* Right Column: Request History */}
          <div>
            <h3 className="text-xl font-semibold mb-6 text-theme-primary">Your Requests</h3>
            
            {userRequests.length === 0 ? (
              <div className="text-center text-theme-secondary py-8">
                <Crown className="w-12 h-12 text-theme-tertiary mx-auto mb-3" />
                <p>No premium requests yet</p>
                <p className="text-sm">Submit your first request to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userRequests.map((request) => (
                  <div key={request.id} className="border border-theme-light rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(request.status)}
                        <span className={`font-medium capitalize status-badge ${
                          request.status === 'approved' ? 'status-approved' :
                          request.status === 'rejected' ? 'status-rejected' :
                          'status-pending'
                        }`}>{request.status}</span>
                      </div>
                      <span className="text-sm text-theme-secondary">
                        {new Date(request.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-theme-secondary">Duration:</span>
                        <span className="text-theme-primary">{request.duration_months} month{request.duration_months > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-theme-secondary">Amount:</span>
                        <span className="text-theme-primary">${request.amount_paid}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-theme-secondary">Payment Method:</span>
                        <span className="text-theme-primary capitalize">{request.payment_method.replace('_', ' ')}</span>
                      </div>
                      {request.admin_notes && (
                        <div className="mt-2 p-2 bg-theme-tertiary rounded text-xs">
                          <strong>Admin Notes:</strong> <span className="text-theme-secondary">{request.admin_notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}