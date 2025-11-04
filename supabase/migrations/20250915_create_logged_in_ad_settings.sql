-- Create logged_in_ad_settings table for storing logged-in non-premium user ad configurations
CREATE TABLE IF NOT EXISTS logged_in_ad_settings (
  id SERIAL PRIMARY KEY,
  logged_in_ad_active BOOLEAN NOT NULL DEFAULT true,
  logged_in_timer_duration INTEGER NOT NULL DEFAULT 5 CHECK (logged_in_timer_duration >= 3 AND logged_in_timer_duration <= 60),
  logged_in_ad_content_type VARCHAR(20) NOT NULL DEFAULT 'image_upload' CHECK (logged_in_ad_content_type IN ('image_upload', 'external_url', 'html_adsense')),
  logged_in_ad_image_url TEXT NULL,
  logged_in_ad_external_url TEXT NULL,
  logged_in_ad_html_content TEXT NULL,
  logged_in_ad_click_url TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_logged_in_ad_settings_active ON logged_in_ad_settings(logged_in_ad_active);
CREATE INDEX IF NOT EXISTS idx_logged_in_ad_settings_updated ON logged_in_ad_settings(updated_at DESC);

-- Insert default settings row (singleton pattern - only one row should exist)
INSERT INTO logged_in_ad_settings (
  logged_in_ad_active,
  logged_in_timer_duration,
  logged_in_ad_content_type,
  logged_in_ad_image_url,
  logged_in_ad_external_url,
  logged_in_ad_html_content,
  logged_in_ad_click_url
) VALUES (
  true,
  5,
  'image_upload',
  NULL,
  NULL,
  NULL,
  NULL
) ON CONFLICT DO NOTHING;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_logged_in_ad_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_logged_in_ad_settings_updated_at_trigger
  BEFORE UPDATE ON logged_in_ad_settings
  FOR EACH ROW
  EXECUTE PROCEDURE update_logged_in_ad_settings_updated_at();

-- Enable RLS (Row Level Security)
ALTER TABLE logged_in_ad_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access only
CREATE POLICY "Admin can manage logged in ad settings" ON logged_in_ad_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Allow public read access for logged-in ad display
CREATE POLICY "Public can read logged in ad settings" ON logged_in_ad_settings
  FOR SELECT USING (true);

COMMIT;