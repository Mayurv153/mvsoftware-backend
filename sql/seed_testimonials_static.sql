-- Seed published testimonials matching the public site carousel
-- Run in Supabase SQL editor after `testimonials` table exists

INSERT INTO testimonials (client_name, client_role, client_company, content, rating, is_published, avatar_url)
SELECT * FROM (VALUES
    ('Dr. Ram', 'Healthcare Professional', NULL, 'MV Webservice built a beautiful website for my practice. The design is clean and it works perfectly on mobile. Highly recommended!', 5, true, '/assets/drRam.png'),
    ('Ram', 'Business Owner', NULL, 'Great work! They delivered ahead of schedule and the quality exceeded my expectations. The website has helped me get more clients.', 5, true, '/assets/Ramtestmonial.png'),
    ('Harshdeep', 'Startup Founder', NULL, 'The AI automation they built for my business saves me hours every day. Professional team that truly understands technology.', 5, true, '/assets/harshdeeptesmonial.png'),
    ('Parth', 'E-Commerce Business', NULL, 'Our online store looks amazing and conversions have increased significantly since the redesign. Worth every penny!', 5, true, '/assets/parth%20testomionial.png'),
    ('Sumit', 'Agency Owner', NULL, 'MV Webservice is my go-to team for all web development. Fast, reliable, and they always deliver top-notch quality.', 5, true, '/assets/sumittestmonial.png'),
    ('Yash D.', 'Digital Marketer', NULL, 'The SEO-optimized website they built for me ranks on the first page of Google. Incredible ROI on my investment.', 5, true, '/assets/yashdtesmonial.png'),
    ('Yash W.', 'Content Creator', NULL, 'Clean, modern, and fast — exactly what I needed. The team was responsive and made changes quickly.', 5, true, '/assets/yashwtestmonial.png')
) AS v(client_name, client_role, client_company, content, rating, is_published, avatar_url)
WHERE NOT EXISTS (
    SELECT 1 FROM testimonials t
    WHERE t.client_name = v.client_name AND t.content = v.content
);
