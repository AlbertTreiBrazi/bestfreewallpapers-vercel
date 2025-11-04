-- Migration: Admin Actions Log System
-- Created: 2025-10-09
-- Description: Creates admin actions log table for tracking all admin activities

-- Create admin_actions_log table
CREATE TABLE IF NOT EXISTS admin_actions_log (
    id SERIAL PRIMARY KEY,
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    admin_email VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    action_type VARCHAR(100) NOT NULL, -- 'grant_premium', 'revoke_premium', 'role_change', 'admin_created', 'admin_deleted', 'bulk_premium_grant'
    action_details JSONB DEFAULT '{}'::jsonb, -- Store additional details like duration, old_role, new_role, etc.
    duration_days INTEGER, -- For premium grants
    notes TEXT, -- Admin notes
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET, -- Track IP for audit
    user_agent TEXT -- Track user agent for audit
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_actions_log_admin_id ON admin_actions_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_log_user_id ON admin_actions_log(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_log_action_type ON admin_actions_log(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_log_timestamp ON admin_actions_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_actions_log_admin_email ON admin_actions_log(admin_email);
CREATE INDEX IF NOT EXISTS idx_admin_actions_log_user_email ON admin_actions_log(user_email);

-- Create RLS policies for admin_actions_log
ALTER TABLE admin_actions_log ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all logs
CREATE POLICY "Admin can view all action logs" ON admin_actions_log
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Only super admins can delete logs
CREATE POLICY "Super admin can delete action logs" ON admin_actions_log
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.is_admin = true
            AND profiles.admin_role = 'super_admin'
        )
    );

-- Allow service role to insert logs (for edge functions)
CREATE POLICY "Service role can insert action logs" ON admin_actions_log
    FOR INSERT TO service_role
    WITH CHECK (true);

-- Create function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
    p_admin_id UUID,
    p_admin_email VARCHAR(255),
    p_user_id UUID DEFAULT NULL,
    p_user_email VARCHAR(255) DEFAULT NULL,
    p_action_type VARCHAR(100),
    p_action_details JSONB DEFAULT '{}'::jsonb,
    p_duration_days INTEGER DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO admin_actions_log (
        admin_id,
        admin_email,
        user_id,
        user_email,
        action_type,
        action_details,
        duration_days,
        notes,
        ip_address,
        user_agent
    ) VALUES (
        p_admin_id,
        p_admin_email,
        p_user_id,
        p_user_email,
        p_action_type,
        p_action_details,
        p_duration_days,
        p_notes,
        p_ip_address,
        p_user_agent
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION log_admin_action TO service_role;
GRANT USAGE ON SEQUENCE admin_actions_log_id_seq TO service_role;

-- Add some sample data for testing (optional - remove in production)
INSERT INTO admin_actions_log (
    admin_id,
    admin_email,
    user_id,
    user_email,
    action_type,
    action_details,
    duration_days,
    notes
) VALUES 
(
    '00000000-0000-0000-0000-000000000000',
    'admin@example.com',
    '11111111-1111-1111-1111-111111111111',
    'user@example.com',
    'grant_premium',
    '{"method": "manual", "reason": "customer support"}'::jsonb,
    30,
    'Premium access granted for customer service issue resolution'
),
(
    '00000000-0000-0000-0000-000000000000',
    'admin@example.com',
    '22222222-2222-2222-2222-222222222222',
    'user2@example.com',
    'role_change',
    '{"old_role": "user", "new_role": "admin"}'::jsonb,
    NULL,
    'Promoted to admin role for content management'
);

COMMIT;