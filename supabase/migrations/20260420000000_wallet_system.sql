-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit')),
  source TEXT NOT NULL CHECK (source IN ('refund', 'cashback', 'payment', 'admin_credit')),
  reference_id TEXT,
  description TEXT,
  balance_after DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add wallet_balance to profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'wallet_balance') THEN
    ALTER TABLE profiles ADD COLUMN wallet_balance DECIMAL(10, 2) DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Add payment_mode to orders if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_mode') THEN
    ALTER TABLE orders ADD COLUMN payment_mode TEXT DEFAULT 'cod' CHECK (payment_mode IN ('cod', 'upi', 'card', 'netbanking', 'wallet'));
  END IF;
END $$;

-- Add payment_mode to return_requests if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'return_requests' AND column_name = 'payment_mode') THEN
    ALTER TABLE return_requests ADD COLUMN payment_mode TEXT;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);

-- Enable RLS
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wallet_transactions
DROP POLICY IF EXISTS "Users can view own wallet transactions" ON wallet_transactions;
CREATE POLICY "Users can view own wallet transactions"
  ON wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can view all wallet transactions" ON wallet_transactions;
CREATE POLICY "Admin can view all wallet transactions"
  ON wallet_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admin can insert wallet transactions" ON wallet_transactions;
CREATE POLICY "Admin can insert wallet transactions"
  ON wallet_transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.is_admin = true
    )
  );

-- Function to add wallet credit
CREATE OR REPLACE FUNCTION add_wallet_credit(
  p_user_id UUID,
  p_amount DECIMAL,
  p_source TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_new_balance DECIMAL;
  v_transaction_id UUID;
BEGIN
  -- Get current balance and update
  UPDATE profiles 
  SET wallet_balance = wallet_balance + p_amount
  WHERE user_id = p_user_id
  RETURNING wallet_balance INTO v_new_balance;

  -- Insert transaction record
  INSERT INTO wallet_transactions (
    user_id, amount, type, source, reference_id, description, balance_after
  ) VALUES (
    p_user_id, p_amount, 'credit', p_source, p_reference_id, p_description, v_new_balance
  ) RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to deduct wallet balance
CREATE OR REPLACE FUNCTION deduct_wallet_balance(
  p_user_id UUID,
  p_amount DECIMAL,
  p_reference_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_new_balance DECIMAL;
  v_transaction_id UUID;
  v_current_balance DECIMAL;
BEGIN
  -- Check current balance
  SELECT wallet_balance INTO v_current_balance
  FROM profiles WHERE user_id = p_user_id;

  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  -- Update balance
  UPDATE profiles 
  SET wallet_balance = wallet_balance - p_amount
  WHERE user_id = p_user_id
  RETURNING wallet_balance INTO v_new_balance;

  -- Insert transaction record
  INSERT INTO wallet_transactions (
    user_id, amount, type, source, reference_id, description, balance_after
  ) VALUES (
    p_user_id, p_amount, 'debit', 'payment', p_reference_id, p_description, v_new_balance
  ) RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for wallet_transactions
ALTER PUBLICATION supabase_realtime ADD TABLE wallet_transactions;
