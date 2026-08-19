-- Seed Reviews Script
-- This script adds 2-3 reviews for every product by rotating through existing users.

DO $$
DECLARE
    r_prod RECORD;
    r_user RECORD;
    user_ids UUID[];
    user_count INTEGER;
    i INTEGER;
    review_count INTEGER;
    v_user_id UUID;
    v_rating INTEGER;
    v_title TEXT;
    v_content TEXT;
    v_sentiment TEXT;
BEGIN
    -- 1. Get up to 3 existing users to attribute reviews to
    SELECT array_agg(id) INTO user_ids FROM (
        SELECT id FROM public.profiles LIMIT 3
    ) AS u;
    
    user_count := array_length(user_ids, 1);
    
    IF user_count IS NULL OR user_count = 0 THEN
        RAISE NOTICE 'No users found in public.profiles. Please create at least one user first.';
        RETURN;
    END IF;

    -- 2. Loop through all products
    FOR r_prod IN SELECT id, name FROM public.products LOOP
        -- Add 2-3 reviews per product
        review_count := floor(random() * 2 + 2)::int;
        
        FOR i IN 1..review_count LOOP
            -- Rotate users
            v_user_id := user_ids[( (i + (ascii(left(r_prod.id, 1)))) % user_count ) + 1];
            
            -- Generate deterministic-ish review content based on iteration
            IF i = 1 THEN
                v_rating := 5;
                v_title := 'Excellent quality!';
                v_content := 'I am really impressed with the ' || r_prod.name || '. The fabric feels premium and the fit is perfect.';
                v_sentiment := 'positive';
            ELSIF i = 2 THEN
                v_rating := 4;
                v_title := 'Great but runs small';
                v_content := 'Love the design of this ' || r_prod.name || '. Just keep in mind it runs a bit small, so maybe size up.';
                v_sentiment := 'positive';
            ELSE
                v_rating := 5;
                v_title := 'Best purchase this year';
                v_content := 'Exactly like the pictures. This ' || r_prod.name || ' is definitely worth the price.';
                v_sentiment := 'positive';
            END IF;

            -- Insert the review
            -- Using ON CONFLICT to avoid duplicates if run multiple times
            INSERT INTO public.reviews (
                user_id, 
                product_id, 
                rating, 
                title, 
                content, 
                review_text, 
                sentiment, 
                is_verified_purchase,
                helpful_count
            )
            VALUES (
                v_user_id,
                r_prod.id,
                v_rating,
                v_title,
                v_content,
                v_content,
                v_sentiment,
                (random() > 0.3), -- 70% chance of being verified
                floor(random() * 10)::int
            )
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Successfully seeded reviews for all products.';
END $$;
