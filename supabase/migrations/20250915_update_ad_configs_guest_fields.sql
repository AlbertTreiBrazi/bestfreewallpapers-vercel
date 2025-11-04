-- Update existing ad_configs table to add guest-specific fields if not already present
-- This migration ensures compatibility with the existing ad system

DO $$
BEGIN
  -- Add guest fields to ad_configs table if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ad_configs' AND column_name = 'guest_ad_active') THEN
    ALTER TABLE ad_configs ADD COLUMN guest_ad_active BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ad_configs' AND column_name = 'guest_timer_duration') THEN
    ALTER TABLE ad_configs ADD COLUMN guest_timer_duration INTEGER DEFAULT 8 CHECK (guest_timer_duration >= 3 AND guest_timer_duration <= 60);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ad_configs' AND column_name = 'guest_ad_content_type') THEN
    ALTER TABLE ad_configs ADD COLUMN guest_ad_content_type VARCHAR(20) DEFAULT 'image_upload' CHECK (guest_ad_content_type IN ('image_upload', 'external_url', 'html_adsense'));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ad_configs' AND column_name = 'guest_ad_image_url') THEN
    ALTER TABLE ad_configs ADD COLUMN guest_ad_image_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ad_configs' AND column_name = 'guest_ad_external_url') THEN
    ALTER TABLE ad_configs ADD COLUMN guest_ad_external_url TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ad_configs' AND column_name = 'guest_ad_html_content') THEN
    ALTER TABLE ad_configs ADD COLUMN guest_ad_html_content TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ad_configs' AND column_name = 'guest_ad_click_url') THEN
    ALTER TABLE ad_configs ADD COLUMN guest_ad_click_url TEXT;
  END IF;
END
$$;

COMMIT;