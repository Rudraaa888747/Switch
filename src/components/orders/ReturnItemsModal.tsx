import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabaseRestInsert, supabaseRestRequest } from '@/integrations/supabase/publicRest';
import { toast } from 'sonner';
import { RETURN_REASON_OPTIONS } from '@/lib/returnReasons';
import { createAdminNotification } from '@/lib/adminNotifications';

interface ReturnableOrderItem {
  id: string;
  product_name: string;
  product_image?: string;
  quantity: number;
}

interface ReturnableOrder {
  id: string;
  order_id?: string;
  source_id: string;
  user_id: string;
  payment_method?: string | null;
  items: ReturnableOrderItem[];
}

interface ReturnItemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ReturnableOrder;
  onSuccess: () => void;
  accessToken?: string | null;
}

const ReturnItemsModal = ({ isOpen, onClose, order, onSuccess, accessToken }: ReturnItemsModalProps) => {
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());
  const [reason, setReason] = useState<string>('');
  const [comment, setComment] = useState('');
  const [refundMethod, setRefundMethod] = useState<'card' | 'upi' | 'cod'>(
    order.payment_method === 'cod' ? 'cod' : 'card'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);

  // Lock body scroll and trigger global overlay hide (Issue #3)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.setAttribute('data-scroll-locked', 'true');
    } else {
      document.body.style.overflow = '';
      document.body.removeAttribute('data-scroll-locked');
    }

    return () => {
      document.body.style.overflow = '';
      document.body.removeAttribute('data-scroll-locked');
    };
  }, [isOpen]);

  const toggleItem = (itemId: string, maxQty: number) => {
    const next = new Map(selectedItems);
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.set(itemId, maxQty);
    }
    setSelectedItems(next);
  };

  const handleSubmit = async () => {
    if (selectedItems.size === 0) {
      toast.error('Please select at least one item to return');
      return;
    }

    if (!reason) {
      toast.error('Please select a return reason');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('[ReturnModal] Initiating submission for order:', order.order_id || order.id);
      
      const requestPayload = {
        order_id: order.source_id,
        user_id: order.user_id,
        reason,
        additional_details: comment || null,
        images: [],
        status: 'requested',
        refund_method: refundMethod === 'cod' ? 'wallet' : refundMethod,
      };

      console.log('[ReturnModal] Request payload:', requestPayload);

      const { data: requestRows } = await supabaseRestRequest<{ id: string }[]>(
        'return_requests',
        {
          method: 'POST',
          body: JSON.stringify([requestPayload]),
          authToken: accessToken,
          headers: {
            Prefer: 'return=representation',
          }
        }
      );

      if (!requestRows || requestRows.length === 0) {
        console.error('[ReturnModal] No data returned from return_requests insert');
        throw new Error('Failed to create return request record');
      }

      const requestData = requestRows[0];
      console.log('[ReturnModal] Return request created:', requestData.id);

      const returnItems = Array.from(selectedItems.entries()).map(([itemId, qty]) => ({
        return_request_id: requestData.id,
        order_item_id: itemId,
        quantity: qty,
      }));

      console.log('[ReturnModal] Submitting return items:', returnItems);
      await supabaseRestRequest('return_request_items', {
        method: 'POST',
        body: JSON.stringify(returnItems),
        authToken: accessToken,
        headers: {
          Prefer: 'return=representation',
        }
      });

      console.log('[ReturnModal] Return items submitted successfully');

      await createAdminNotification({
        title: 'New return request',
        message: `Return requested for order ${order.order_id || order.source_id}.`,
        type: 'warning',
        eventType: 'return_request',
        link: '/admin/returns',
        metadata: {
          returnRequestId: requestData.id,
          orderId: order.order_id || order.source_id,
          userId: order.user_id,
          reason,
          itemCount: returnItems.length,
        },
      }).catch((nErr: unknown) => console.error('[ReturnModal] Admin notification failed:', nErr));

      setStep(3);
      toast.success('Return request submitted successfully');
      onSuccess();
    } catch (error: unknown) {
      console.error('[ReturnModal] Submission error:', error);
      const errorMessage = (error as Error)?.message || 'Failed to submit return request';
      const errorHint = (error as { hint?: string })?.hint ? ` (${(error as { hint?: string }).hint})` : '';
      toast.error(`${errorMessage}${errorHint}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 40 }}
        className="bg-card border border-border/50 w-full max-w-lg md:rounded-2xl rounded-t-[2rem] shadow-2xl flex flex-col max-h-[90dvh] md:max-h-[85dvh] overflow-hidden"
      >
        <div className="px-6 md:px-8 py-5 flex items-center justify-between border-b border-border/40 bg-muted/30 shrink-0">
          <div>
            <h2 className="text-xl font-bold tracking-tight uppercase">Return Request</h2>
            <p className="text-xs text-muted-foreground mt-1 tracking-widest uppercase">
              Order #{order.order_id || order.id}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar pb-safe">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] text-primary-foreground font-bold">1</div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider">Select Items to Return</h3>
                </div>

                <div className="space-y-3 max-h-[40dvh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => toggleItem(item.id, item.quantity)}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                        selectedItems.has(item.id)
                          ? 'bg-primary/5 border-primary shadow-sm'
                          : 'bg-muted/20 border-border/40 hover:border-border'
                      }`}
                    >
                      <div className="relative group">
                        <img loading="lazy" decoding="async"
                          src={item.product_image || '/placeholder.svg'}
                          alt={item.product_name}
                          className="w-16 h-20 object-cover rounded-lg shadow-sm group-hover:scale-105 transition-transform"
                        />
                        <div className={`absolute inset-0 flex items-center justify-center rounded-lg transition-opacity ${selectedItems.has(item.id) ? 'bg-primary/20 opacity-100' : 'opacity-0'}`}>
                          <CheckCircle2 className="text-primary h-6 w-6" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground mt-1">Quantity: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={selectedItems.size === 0}
                    className="w-full h-12 rounded-xl text-sm font-bold uppercase tracking-widest shadow-lg shadow-primary/20"
                  >
                    Next Step
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] text-primary-foreground font-bold">2</div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider">Return Reason</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Select Return Reason *</label>
                    <Select value={reason} onValueChange={setReason}>
                      <SelectTrigger className="w-full h-12 bg-muted/20 border-border/40 rounded-xl focus:ring-primary">
                        <SelectValue placeholder="Select a reason..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border z-[110]">
                        {RETURN_REASON_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Refund Method</label>
                    <Select value={refundMethod} onValueChange={(value) => setRefundMethod(value as typeof refundMethod)}>
                      <SelectTrigger className="w-full h-12 bg-muted/20 border-border/40 rounded-xl focus:ring-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border z-[110]">
                        <SelectItem value="card">Card refund</SelectItem>
                        <SelectItem value="upi">UPI refund</SelectItem>
                        <SelectItem value="cod">Cash on Delivery refund</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      COD refunds are credited to your wallet automatically for faster processing.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Additional Comments (Optional)</label>
                    <Textarea
                      placeholder="Share more details about your return request..."
                      className="min-h-[110px] bg-muted/20 border-border/40 rounded-xl focus:ring-primary resize-none p-4"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>

                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="h-12 flex-1 rounded-xl text-xs uppercase font-bold tracking-widest">
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !reason}
                    className="h-12 flex-[2] rounded-xl text-xs uppercase font-bold tracking-widest shadow-lg shadow-primary/20"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Return Request'}
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-10 text-center space-y-6"
              >
                <div className="relative inline-block">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                    className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-green-500/20"
                  >
                    <CheckCircle2 size={40} className="text-white" />
                  </motion.div>
                </div>
                <div>
                  <h3 className="text-2xl font-bold tracking-tight">Request Submitted</h3>
                  <p className="text-muted-foreground mt-2 max-w-[280px] mx-auto text-sm">
                    Your return request has been submitted successfully. A support agent will review it shortly.
                  </p>
                </div>
                <div className="pt-4">
                  <Button onClick={onClose} className="w-full h-12 rounded-xl text-xs uppercase font-bold tracking-widest">
                    Back to My Orders
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default ReturnItemsModal;
