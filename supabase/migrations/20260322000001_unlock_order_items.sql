DROP POLICY IF EXISTS "order_items_select_all" ON public.order_items;
CREATE POLICY "order_items_select_all" ON public.order_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "order_items_insert_all" ON public.order_items;
CREATE POLICY "order_items_insert_all" ON public.order_items FOR INSERT WITH CHECK (true);
