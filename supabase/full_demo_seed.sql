-- Full Demo Seeding Script
-- This script adds 2-3 reviews for every product by rotating through existing users in public.profiles.

DO $$
DECLARE
    r_prod RECORD;
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
    -- 1. Try to find existing users from profiles
    SELECT array_agg(user_id) INTO user_ids FROM (
        SELECT user_id FROM public.profiles LIMIT 5
    ) AS u;
    
    user_count := array_length(user_ids, 1);
    
    -- 2. If no users found, provide instructions
    IF user_count IS NULL OR user_count = 0 THEN
        RAISE NOTICE '------------------------------------------------------------';
        RAISE NOTICE 'CRITICAL: No users found in public.profiles.';
        RAISE NOTICE 'Please sign up for a test account on the website first.';
        RAISE NOTICE 'Location: http://localhost:5173/auth';
        RAISE NOTICE '------------------------------------------------------------';
        RETURN;
    END IF;

    RAISE NOTICE 'Seeding reviews using % found users...', user_count;

    -- 3. Loop through all products
    FOR r_prod IN SELECT id, name FROM public.products LOOP
        -- Select how many reviews (2 or 3)
        review_count := floor(random() * 2 + 2)::int;
        
        FOR i IN 1..review_count LOOP
            -- Pick user from the rotation
            v_user_id := user_ids[( (i + ascii(substr(r_prod.id, 1, 1))) % user_count ) + 1];
            
            -- content generation
            IF i = 1 THEN
                v_rating := 5;
                v_title := 'Absolutely premium!';
                v_content := 'I am so happy with my ' || r_prod.name || '. The quality exceeds my expectations and the delivery was very fast.';
                v_sentiment := 'positive';
            ELSIF i = 2 THEN
                v_rating := 4;
                v_title := 'Very comfortable';
                v_content := 'The ' || r_prod.name || ' is great for daily use. Soft material and fits true to size.';
                v_sentiment := 'positive';
            ELSE
                v_rating := 5;
                v_title := 'Worth every penny';
                v_content := 'Best ' || r_prod.category || ' purchase I have made. Will definitely buy more from this collection.';
                v_sentiment := 'positive';
            END IF;

            -- 4. Insert reviews
            -- Note: We manually set is_verified_purchase = true for the demo
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
                true, -- Hardcode for demo visibility
                floor(random() * 5 + 1)::int
            )
            ON CONFLICT (user_id, product_id) DO UPDATE SET
                rating = EXCLUDED.rating,
                title = EXCLUDED.title,
                content = EXCLUDED.content,
                review_text = EXCLUDED.review_text,
                sentiment = EXCLUDED.sentiment,
                is_verified_purchase = true;
                
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Successfully seeded reviews for % products.', (SELECT count(*) FROM public.products);
END $$;
