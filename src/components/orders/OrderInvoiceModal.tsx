import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, MapPin, Receipt, Copy, Check, Package, Clock, Truck, CheckCircle, XCircle, AlertCircle, CreditCard, Wallet, IndianRupee } from 'lucide-react';
import { formatPrice } from '@/data/products';
import { OrderGroup } from '@/lib/orders';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface OrderInvoiceModalProps {
  order: OrderGroup;
}

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case 'order placed':
    case 'pending': return <Package className="w-4 h-4 text-amber-500" />;
    case 'processing': return <Clock className="w-4 h-4 text-blue-500" />;
    case 'shipped': return <Truck className="w-4 h-4 text-indigo-500" />;
    case 'out for delivery': return <Truck className="w-4 h-4 text-purple-500" />;
    case 'delivered': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    case 'cancelled': return <XCircle className="w-4 h-4 text-red-500" />;
    default: return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'order placed':
    case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    case 'processing': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    case 'shipped': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
    case 'out for delivery': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    case 'delivered': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
    case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
    default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }
};

const getPaymentIcon = (method: string) => {
  switch (method.toLowerCase()) {
    case 'card': return <CreditCard className="w-4 h-4 text-muted-foreground" />;
    case 'wallet': return <Wallet className="w-4 h-4 text-muted-foreground" />;
    case 'upi': return <IndianRupee className="w-4 h-4 text-muted-foreground" />;
    case 'cod': return <Package className="w-4 h-4 text-muted-foreground" />;
    default: return <CreditCard className="w-4 h-4 text-muted-foreground" />;
  }
};

const OrderInvoiceModal: React.FC<OrderInvoiceModalProps> = ({ order }) => {
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const parseAddress = (addressStr: string | null) => {
    if (!addressStr) return null;
    try {
      return JSON.parse(addressStr);
    } catch {
      return null;
    }
  };

  const address = parseAddress(order.shipping_address);
  const displayId = order.order_id || order.id;
  
  const getTaxRate = (price: number) => price <= 1000 ? 5 : 12;

  // Calculate actual sum per tax rate from the items
  const taxTotals = { 5: 0, 12: 0 };
  order.items.forEach(item => {
    const rate = getTaxRate(item.unit_price);
    // Estimated tax without discount
    taxTotals[rate as 5|12] += item.unit_price * item.quantity * (rate / 100);
  });

  // Proportionally scale to actual order.tax if discount was applied
  const totalEstimatedTax = taxTotals[5] + taxTotals[12];
  const taxScale = totalEstimatedTax > 0 ? (order.tax / totalEstimatedTax) : 1;
  const finalTax5 = taxTotals[5] * taxScale;
  const finalTax12 = taxTotals[12] * taxScale;

  const handleCopyId = () => {
    navigator.clipboard.writeText(displayId);
    setCopied(true);
    toast({ title: "Order ID copied to clipboard", duration: 2000 });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full bg-card border-border hover:bg-muted text-foreground">
          <FileText className="mr-2 h-4 w-4" />
          View Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl font-light tracking-wide">
              <Receipt className="w-5 h-5 text-primary" />
              Tax Invoice
            </DialogTitle>
            <div className="flex items-center gap-2">
              {getStatusIcon(order.status)}
              <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="space-y-10">
            {/* Header / Business Info */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-8">
              <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-widest uppercase">SWITCH</h2>
                <p className="text-sm font-medium text-muted-foreground">Premium Apparel & Accessories</p>
                <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                  <p>123 Fashion Street, Tech Park</p>
                  <p>Mumbai, Maharashtra 400001</p>
                  <p>Email: support@switch.com</p>
                  <p>GSTIN: 27AAAAA0000A1Z5</p>
                </div>
              </div>
              <div className="text-left md:text-right space-y-3">
                <div className="inline-block text-left md:text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Order ID</p>
                  <div className="flex items-center justify-start md:justify-end gap-2 group">
                    <p className="font-mono text-lg font-bold text-foreground">{displayId}</p>
                    <button 
                      onClick={handleCopyId} 
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy Order ID"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Order Date</p>
                  <p className="text-sm font-medium">{order.order_date ? new Date(order.order_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Payment Method</p>
                  <div className="flex items-center justify-start md:justify-end gap-1.5 text-sm font-medium uppercase">
                    {getPaymentIcon(order.payment_method || '')}
                    <span>{order.payment_method || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Customer Details */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-widest flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Billed To
              </h3>
              <div className="bg-muted/30 rounded-xl p-5 border border-border/50">
                <p className="font-semibold text-foreground text-base mb-1">{order.customer_name || 'Guest Customer'}</p>
                {order.customer_phone && <p className="text-sm text-muted-foreground mb-2">{order.customer_phone}</p>}
                
                <div className="text-sm text-muted-foreground leading-relaxed">
                  {address ? (
                    <>
                      <p>{address.line1}</p>
                      <p>{order.shipping_city}, {order.shipping_state} {order.shipping_pincode}</p>
                    </>
                  ) : (
                    <>
                      {order.shipping_address ? <p>{order.shipping_address}</p> : null}
                      {(order.shipping_city || order.shipping_state || order.shipping_pincode) ? (
                        <p>
                          {[order.shipping_city, order.shipping_state, order.shipping_pincode].filter(Boolean).join(', ')}
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Items Table - Responsive */}
            <div>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm admin-table-responsive">
                  <thead className="bg-muted/50 text-muted-foreground border-b border-border hidden md:table-header-group">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium">Item Description</th>
                      <th className="text-center py-3 px-4 font-medium">GST Rate</th>
                      <th className="text-right py-3 px-4 font-medium">Qty</th>
                      <th className="text-right py-3 px-4 font-medium">Unit Price</th>
                      <th className="text-right py-3 px-4 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border flex flex-col md:table-row-group">
                    {order.items.map((item, idx) => {
                      const taxRate = getTaxRate(item.unit_price);
                      const variantStr = [item.size, item.color].filter(Boolean).join(' • ');

                      return (
                        <tr key={item.id || idx} className="hover:bg-muted/10 transition-colors flex flex-col md:table-row p-4 md:p-0 gap-2 md:gap-0">
                          <td className="py-2 md:py-4 md:px-4" data-label="Item Description">
                            <p className="font-semibold text-foreground">{item.product_name}</p>
                            {variantStr && <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-wider">{variantStr}</p>}
                          </td>
                          <td className="py-1 md:py-4 md:px-4 text-left md:text-center text-muted-foreground flex justify-between md:table-cell" data-label="GST Rate">
                            <span className="md:hidden text-muted-foreground font-medium text-xs uppercase tracking-wider">GST Rate</span>
                            <span>{taxRate}%</span>
                          </td>
                          <td className="py-1 md:py-4 md:px-4 text-left md:text-right text-muted-foreground flex justify-between md:table-cell" data-label="Qty">
                            <span className="md:hidden text-muted-foreground font-medium text-xs uppercase tracking-wider">Qty</span>
                            <span>{item.quantity}</span>
                          </td>
                          <td className="py-1 md:py-4 md:px-4 text-left md:text-right text-muted-foreground flex justify-between md:table-cell" data-label="Unit Price">
                            <span className="md:hidden text-muted-foreground font-medium text-xs uppercase tracking-wider">Unit Price</span>
                            <span>{formatPrice(item.unit_price)}</span>
                          </td>
                          <td className="py-1 md:py-4 md:px-4 text-left md:text-right font-medium flex justify-between md:table-cell pt-3 border-t border-border/40 md:border-t-0 mt-2 md:mt-0" data-label="Total">
                            <span className="md:hidden text-muted-foreground font-medium text-xs uppercase tracking-wider">Total</span>
                            <span>{formatPrice(item.total_price)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            <div className="flex justify-end">
              <div className="w-full max-w-sm md:max-w-none space-y-3.5 text-sm md:px-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatPrice(order.subtotal)}</span>
                </div>
                
                {order.discount_applied > 0 && (
                  <div className="flex justify-between items-center text-emerald-500">
                    <span>Discount Applied</span>
                    <span className="font-medium">-{formatPrice(order.discount_applied)}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium">{order.shipping_cost === 0 ? 'Free' : formatPrice(order.shipping_cost)}</span>
                </div>

                <div className="pt-2 border-t border-border/40 space-y-2">
                  {taxTotals[5] > 0 && (
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>GST @ 5%</span>
                      <span>{formatPrice(finalTax5)}</span>
                    </div>
                  )}
                  {taxTotals[12] > 0 && (
                    <div className="flex justify-between items-center text-muted-foreground">
                      <span>GST @ 12%</span>
                      <span>{formatPrice(finalTax12)}</span>
                    </div>
                  )}
                  {order.discount_applied > 0 && (
                    <div className="text-[10px] text-muted-foreground/60 text-right mt-1">
                      * GST shown reflects discount-adjusted rates
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Grand Total</span>
                    <span className="text-primary">{formatPrice(order.grand_total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderInvoiceModal;
