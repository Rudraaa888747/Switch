# Wallet System Implementation

## Overview
Complete wallet system with refund processing, transaction history, and instant credit functionality.

## Database Changes

### New Migration: `20260420000000_wallet_system.sql`

**New Table: `wallet_transactions`**
- `id` - UUID primary key
- `user_id` - References profiles
- `amount` - Transaction amount
- `type` - 'credit' or 'debit'
- `source` - 'refund', 'cashback', 'payment', 'admin_credit'
- `reference_id` - Link to order/return
- `description` - Human-readable description
- `balance_after` - Balance after transaction
- `created_at` - Timestamp
- `metadata` - JSONB for extra data

**New Columns:**
- `profiles.wallet_balance` - User's current wallet balance (DECIMAL)
- `orders.payment_mode` - Payment method used ('cod', 'upi', 'card', 'netbanking', 'wallet')
- `return_requests.payment_mode` - Payment mode from original order

**New Functions:**
- `add_wallet_credit(user_id, amount, source, reference_id, description)` - Credits wallet
- `deduct_wallet_balance(user_id, amount, reference_id, description)` - Debits wallet

**RLS Policies:**
- Users can view their own transactions
- Admins can view all transactions
- Admins can insert transactions

## Admin Side Features

### AdminReturns.tsx Updates

**New Payment Mode Column:**
- Shows payment method (COD, UPI, Card, etc.) in returns table
- Displays in return details modal

**Instant Refund Processing:**
- "Give Refund" button calls `add_wallet_credit()` RPC function
- Credits user wallet instantly
- Updates return status to 'refunded'
- Shows success toast with amount

**Workflow:**
1. Admin views return request
2. Sees payment mode and refund amount
3. Clicks "Mark Refunded" button
4. System automatically:
   - Credits user wallet
   - Updates return status
   - Creates transaction record
   - Shows confirmation

## User Side Features

### New Wallet Page (`/wallet`)

**Features:**
- Large balance display card
- Transaction history with filters (All/Credits/Debits)
- Color-coded transaction types:
  - Green: Credits (Refunds, Cashback)
  - Red: Debits (Payments)
- Transaction details:
  - Amount
  - Source/Type badge
  - Reference ID
  - Balance after transaction
  - Timestamp
- Info section explaining wallet usage

**Access:**
- Direct route: `/wallet`
- Link from Profile page (Quick Stats card)
- Link from Profile > Personal Information tab

### Profile.tsx Updates

**Wallet Quick Stat:**
- Now clickable - links to `/wallet`
- Shows current balance

**Profile Tab:**
- Wallet balance card with "View Wallet History" button
- Links to full wallet page

## How It Works

### Refund Flow:
1. Customer initiates return
2. Admin approves and picks up item
3. Admin clicks "Mark Refunded"
4. Backend:
   ```sql
   SELECT add_wallet_credit(
     user_id,
     refund_amount,
     'refund',
     return_request_id,
     'Refund for return request #XXX'
   );
   ```
5. User's `wallet_balance` updated
6. Transaction record created in `wallet_transactions`
7. User sees credit in wallet instantly

### Transaction History:
- Real-time updates via Supabase Realtime
- Filtered by user_id (RLS enforced)
- Sorted by created_at DESC
- Shows running balance after each transaction

## Usage Instructions

### For Admins:
1. Go to Admin > Returns
2. View return request
3. Check payment mode in table/modal
4. Click "Mark Refunded" when item received
5. Refund automatically credited to user wallet

### For Users:
1. Go to Profile or click Wallet card
2. View current balance
3. Click "View Wallet History" or go to `/wallet`
4. See all transactions with filters
5. Use wallet balance during checkout

## Database Setup

Run the migration:
```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase SQL Editor
# Copy contents of: supabase/migrations/20260420000000_wallet_system.sql
```

## Testing

1. Create a test order
2. Initiate return as user
3. As admin, approve and mark refunded
4. Check user wallet - should show credit
5. Go to `/wallet` - transaction should appear
6. Verify balance updates correctly

## Security

- RLS policies ensure users only see their own transactions
- Only admins can insert wallet transactions
- Functions use SECURITY DEFINER for controlled access
- All amounts validated before processing

## Future Enhancements

- Wallet payment option during checkout
- Cashback on orders
- Admin manual credit/debit
- Wallet withdrawal requests
- Transaction export (CSV/PDF)
