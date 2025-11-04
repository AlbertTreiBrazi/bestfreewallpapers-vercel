-- Create guest_ad_settings table for storing guest user ad configurations
CREATE TABLE IF NOT EXISTS guest_ad_settings (
  id SERIAL PRIMARY KEY,
  guest_ad_active BOOLEAN NOT NULL DEFAULT true,
  guest_timer_duration INTEGER NOT NULL DEFAULT 8 CHECK (guest_timer_duration >= 3 AND guest_timer_duration <= 60),
  guest_ad_content_type VARCHAR(20) NOT NULL DEFAULT 'image_upload' CHECK (guest_ad_content_type IN ('image_upload', 'external_url', 'html_adsense')),
  guest_ad_image_url TEXT NULL,
  guest_ad_external_url TEXT NULL,
  guest_ad_html_content TEXT NULL,
  guest_ad_click_url TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_guest_ad_settings_active ON guest_ad_settings(guest_ad_active);
CREATE INDEX IF NOT EXISTS idx_guest_ad_settings_updated ON guest_ad_settings(updated_at DESC);

-- Insert default settings row (singleton pattern - only one row should exist)
INSERT INTO guest_ad_settings (
  guest_ad_active,
  guest_timer_duration,
  guest_ad_content_type,
  guest_ad_image_url,
  guest_ad_external_url,
  guest_ad_html_content,
  guest_ad_click_url
) VALUES (
  true,
  8,
  'image_upload',
  NULL,
  NULL,
  NULL,
  NULL
) ON CONFLICT DO NOTHING;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_guest_ad_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_guest_ad_settings_updated_at_trigger
  BEFORE UPDATE ON guest_ad_settings
  FOR EACH ROW
  EXECUTE PROCEDURE update_guest_ad_settings_updated_at();

-- Enable RLS (Row Level Security)
ALTER TABLE guest_ad_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access only
CREATE POLICY "Admin can manage guest ad settings" ON guest_ad_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Allow public read access for guest ad display
CREATE POLICY "Public can read guest ad settings" ON guest_ad_settings
  FOR SELECT USING (true);

COMMIT;