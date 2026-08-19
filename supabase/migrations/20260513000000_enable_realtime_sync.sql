-- Migration to enable real-time updates for orders and returns
-- This allows the frontend to receive instant updates when statuses change

DO $$
BEGIN
    -- Check if the publication 'supabase_realtime' exists
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        -- Add tables to the publication (safe because ALTER PUBLICATION ADD TABLE fails gracefully if already added or handles it)
        -- We use EXCEPTION block to handle cases where tables are already in publication
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
        EXCEPTION WHEN others THEN RAISE NOTICE 'Table orders already in publication or error: %', SQLERRM;
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.return_requests;
        EXCEPTION WHEN others THEN RAISE NOTICE 'Table return_requests already in publication or error: %', SQLERRM;
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
        EXCEPTION WHEN others THEN RAISE NOTICE 'Table order_items already in publication or error: %', SQLERRM;
        END;

        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.return_request_items;
        EXCEPTION WHEN others THEN RAISE NOTICE 'Table return_request_items already in publication or error: %', SQLERRM;
        END;
    ELSE
        -- If publication doesn't exist, create it with the tables
        CREATE PUBLICATION supabase_realtime FOR TABLE public.orders, public.return_requests, public.order_items, public.return_request_items;
    END IF;
END $$;
