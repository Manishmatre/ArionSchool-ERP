import React, { useState, useEffect } from 'react';
import {
  FiCheckCircle, FiX, FiCreditCard, FiAlertCircle, FiLock,
  FiPrinter, FiArrowRight, FiShield
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import { getRazorpayConfig, createRazorpayOrder, verifyRazorpayPayment } from '../../api/razorpayApi';
import { useBranding } from '../../context/BrandingContext';

export default function RazorpayFeeModal({
  isOpen,
  onClose,
  student,
  obligation,
  amountToPay,
  onPaymentSuccess
}) {
  const { branding, schoolName } = useBranding();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Dynamically load Razorpay SDK
  useEffect(() => {
    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  if (!isOpen) return null;

  const handlePayNow = async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      // 1. Get Public Gateway Config
      const configRes = await getRazorpayConfig();
      const config = configRes.data?.data;

      if (!config?.keyId) {
        throw new Error('Razorpay Gateway is not configured. Please contact the school administrator.');
      }

      // 2. Create Order on Server
      const orderRes = await createRazorpayOrder({
        studentId: student?._id,
        obligationId: obligation?._id,
        amount: amountToPay || obligation?.amountPending || 1000,
        notes: {
          component: obligation?.component || 'tuition',
          studentAdmission: student?.admissionNumber || student?.studentId
        }
      });

      if (!orderRes.data?.success) {
        throw new Error(orderRes.data?.message || 'Failed to initialize payment order');
      }

      const orderData = orderRes.data.data;

      // 3. Open Razorpay Checkout
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: schoolName || 'SES Educare',
        description: `Fee Payment - ${obligation?.component || 'Installment'}`,
        order_id: orderData.orderId,
        image: branding?.logoUrl || undefined,
        prefill: {
          name: `${student?.personalInfo?.firstName || ''} ${student?.personalInfo?.lastName || ''}`.trim(),
          email: student?.personalInfo?.email || '',
          contact: student?.personalInfo?.mobileNumber || ''
        },
        theme: {
          color: branding?.visual?.primaryColor || '#2563eb'
        },
        handler: async function (response) {
          setVerifying(true);
          try {
            // 4. Verify Payment Server-Side
            const verifyRes = await verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              studentId: student?._id,
              obligationId: obligation?._id,
              amount: amountToPay || obligation?.amountPending,
              breakdown: [{
                component: obligation?.component || 'tuition',
                amount: Number(amountToPay || obligation?.amountPending)
              }]
            });

            if (verifyRes.data?.success) {
              setReceipt(verifyRes.data.data);
              toast.success('Payment completed & verified successfully!');
              if (onPaymentSuccess) {
                onPaymentSuccess(verifyRes.data.data);
              }
            } else {
              throw new Error(verifyRes.data?.message || 'Verification rejected by server');
            }
          } catch (verifyErr) {
            console.error('Payment verification error:', verifyErr);
            setErrorMessage(verifyErr.response?.data?.message || verifyErr.message || 'Signature verification failed');
            toast.error('Payment verification failed');
          } finally {
            setVerifying(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            toast.info('Payment window closed');
          }
        }
      };

      if (!window.Razorpay) {
        throw new Error('Razorpay Checkout SDK failed to load. Please check your network connection.');
      }

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.on('payment.failed', function (failResp) {
        console.error('Razorpay payment failed:', failResp);
        setErrorMessage(failResp.error?.description || 'Payment transaction failed at gateway.');
        toast.error('Payment transaction failed');
        setLoading(false);
      });

      rzpInstance.open();
      setLoading(false);
    } catch (err) {
      console.error('Razorpay Checkout error:', err);
      const msg = err.response?.data?.message || err.message || 'Payment initiation failed';
      setErrorMessage(msg);
      toast.error(msg);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 border border-primary-100 flex items-center justify-center">
              <FiCreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 tracking-tight">Razorpay Online Payment</h3>
              <p className="text-[11px] text-slate-500">256-bit Encrypted Security</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {receipt ? (
            /* Success State */
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <FiCheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Payment Successful!</h4>
                <p className="text-xs text-slate-500 mt-1">Official School Fee Receipt Generated</p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt Number:</span>
                  <span className="font-mono font-bold text-primary-700">{receipt.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Paid:</span>
                  <span className="font-bold text-slate-900">INR {receipt.amount?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Gateway Status:</span>
                  <span className="font-semibold text-emerald-600 capitalize">{receipt.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex justify-center space-x-3 pt-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                >
                  <FiPrinter className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            /* Checkout Details */
            <div className="space-y-4">
              {/* Fee Breakdown Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Student Name:</span>
                  <span className="font-semibold text-slate-900">
                    {student?.personalInfo?.firstName} {student?.personalInfo?.lastName}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Admission Number:</span>
                  <span className="font-mono text-slate-800">
                    {student?.admissionNumber || student?.studentId || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Fee Category:</span>
                  <span className="capitalize font-semibold text-slate-800">
                    {obligation?.component?.replace('_', ' ') || 'School Tuition Fee'}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900">
                  <span>Total Payable:</span>
                  <span className="text-base text-primary-600 font-mono">
                    INR {(amountToPay || obligation?.amountPending || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-xs text-rose-800">
                  <FiAlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{errorMessage}</p>
                </div>
              )}

              {/* Trust Badge */}
              <div className="flex items-center space-x-2 text-[11px] text-slate-500 py-1">
                <FiShield className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Supports UPI (Google Pay, PhonePe, Paytm), Net Banking, Cards</span>
              </div>

              {/* Actions */}
              <div className="pt-2 flex flex-col space-y-2">
                <button
                  onClick={handlePayNow}
                  disabled={loading || verifying}
                  className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center space-x-2"
                >
                  <FiLock className="w-4 h-4" />
                  <span>
                    {verifying
                      ? 'Verifying Signature...'
                      : loading
                      ? 'Contacting Gateway...'
                      : `Pay INR ${(amountToPay || obligation?.amountPending || 0).toLocaleString('en-IN')} via Razorpay`}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 font-medium transition"
                >
                  Cancel and Return
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
