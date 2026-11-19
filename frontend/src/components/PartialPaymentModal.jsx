import { TbCurrencyRupee } from 'react-icons/tb';
import React, { useState } from 'react';
import { FiX, FiCalendar, FiCreditCard } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../api/axios';

const PartialPaymentModal = ({ isOpen, onClose, payment, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [transactionId, setTransactionId] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !payment) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const payAmount = parseFloat(amount);
    if (!payAmount || payAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (payAmount > payment.amount) {
      toast.error(`Amount cannot exceed the pending balance (₹${payment.amount})`);
      return;
    }

    try {
      setLoading(true);
      await api.put(`/payments/${payment._id}/partial-payment`, {
        amount: payAmount,
        paymentMethod,
        transactionId
      });
      
      toast.success('Partial payment recorded successfully');
      onSuccess();
    } catch (error) {
      console.error('Error recording partial payment:', error);
      toast.error(error.response?.data?.message || 'Failed to record partial payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FiCreditCard className="text-primary-600" />
            Record Partial Payment
          </h3>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Payment Info */}
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-blue-700">Receipt Number:</span>
              <span className="font-mono font-semibold">{payment.receiptNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-blue-700">Pending Balance:</span>
              <span className="font-bold text-blue-900">₹{payment.amount.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Amount Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Payment Amount (₹)
            </label>
            <div className="relative">
              <TbCurrencyRupee className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount to pay"
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                required
                max={payment.amount}
                step="0.01"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Remaining after this: ₹{(payment.amount - (parseFloat(amount) || 0)).toLocaleString('en-IN')}
            </p>
          </div>

          {/* Method Field */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="input-field focus:ring-2 focus:ring-primary-500 outline-none"
              required
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>

          {/* Transaction ID */}
          {paymentMethod !== 'cash' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Transaction ID / Ref No.
              </label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Enter transaction ID"
                className="input-field focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Confirm Payment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PartialPaymentModal;
