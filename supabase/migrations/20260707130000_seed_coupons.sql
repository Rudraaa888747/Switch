-- Migration to seed 3 valid coupons for the Admin Marketing panel

INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_uses, current_uses, is_active, expires_at)
VALUES 
  ('SUMMER20', 'percentage', 20, 999, 100, 0, true, '2026-12-31 23:59:59+00'),
  ('WELCOME500', 'flat', 500, 1999, 50, 0, true, '2026-12-31 23:59:59+00'),
  ('FLAT1000', 'flat', 1000, 3999, 500, 0, true, '2026-12-31 23:59:59+00')
ON CONFLICT DO NOTHING;
