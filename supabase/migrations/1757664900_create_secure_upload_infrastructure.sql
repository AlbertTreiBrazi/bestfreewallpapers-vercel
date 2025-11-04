-- Migration: Create Upload Security Infrastructure
-- Purpose: Add tables and functions for secure file upload tracking and security
-- Date: 2025-01-14

-- Create upload_logs table for audit trail
CREATE TABLE IF NOT EXISTS upload_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    upload_type TEXT NOT NULL DEFAULT 'wallpaper',
    security_scans_performed TEXT[] DEFAULT ARRAY[]::TEXT[],
    upload_status TEXT NOT NULL DEFAULT 'success',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create file_security_scans table for detailed security scan results
CREATE TABLE IF NOT EXISTS file_security_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_log_id UUID REFERENCES upload_logs(id) ON DELETE CASCADE,
    scan_type TEXT NOT NULL,
    scan_result JSONB NOT NULL,
    threats_detected TEXT[] DEFAULT ARRAY[]::TEXT[],
    scan_duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create upload_quarantine table for suspicious files
CREATE TABLE IF NOT EXISTS upload_quarantine (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    original_file_name TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    quarantine_reason TEXT NOT NULL,
    threat_level TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
    scan_results JSONB NOT NULL,
    file_metadata JSONB,
    admin_reviewed BOOLEAN DEFAULT FALSE,
    admin_review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- Create upload_rate_limits table for upload-specific rate limiting
CREATE TABLE IF NOT EXISTS upload_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    upload_type TEXT NOT NULL,
    uploads_count INTEGER DEFAULT 1,
    window_start TIMESTAMPTZ DEFAULT NOW(),
    last_upload TIMESTAMPTZ DEFAULT NOW(),
    total_size_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, upload_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_upload_logs_user_id ON upload_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_logs_created_at ON upload_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_upload_logs_upload_type ON upload_logs(upload_type);
CREATE INDEX IF NOT EXISTS idx_upload_logs_status ON upload_logs(upload_status);

CREATE INDEX IF NOT EXISTS idx_file_security_scans_upload_log_id ON file_security_scans(upload_log_id);
CREATE INDEX IF NOT EXISTS idx_file_security_scans_scan_type ON file_security_scans(scan_type);

CREATE INDEX IF NOT EXISTS idx_upload_quarantine_user_id ON upload_quarantine(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_quarantine_threat_level ON upload_quarantine(threat_level);
CREATE INDEX IF NOT EXISTS idx_upload_quarantine_admin_reviewed ON upload_quarantine(admin_reviewed);

CREATE INDEX IF NOT EXISTS idx_upload_rate_limits_user_id ON upload_rate_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_rate_limits_window_start ON upload_rate_limits(window_start);

-- Enable Row Level Security
ALTER TABLE upload_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_security_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_quarantine ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for upload_logs
CREATE POLICY "Users can view their own upload logs" ON upload_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all upload logs" ON upload_logs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Admins can view all upload logs" ON upload_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- RLS Policies for file_security_scans
CREATE POLICY "Users can view scans for their uploads" ON file_security_scans
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM upload_logs 
            WHERE upload_logs.id = file_security_scans.upload_log_id 
            AND upload_logs.user_id = auth.uid()
        )
    );

CREATE POLICY "Service role can manage all security scans" ON file_security_scans
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Admins can view all security scans" ON file_security_scans
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- RLS Policies for upload_quarantine (Admin and Service Role only)
CREATE POLICY "Service role can manage quarantine" ON upload_quarantine
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Admins can view quarantine" ON upload_quarantine
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

CREATE POLICY "Admins can update quarantine reviews" ON upload_quarantine
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.is_admin = true
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- RLS Policies for upload_rate_limits
CREATE POLICY "Users can view their rate limits" ON upload_rate_limits
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage rate limits" ON upload_rate_limits
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Admins can view all rate limits" ON upload_rate_limits
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.user_id = auth.uid() 
            AND profiles.is_admin = true
        )
    );

-- Create function to check upload rate limits
CREATE OR REPLACE FUNCTION check_upload_rate_limit(
    p_user_id UUID,
    p_upload_type TEXT,
    p_file_size BIGINT DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
    rate_limit_row upload_rate_limits%ROWTYPE;
    max_uploads_per_hour INTEGER := 10;
    max_size_per_hour BIGINT := 50 * 1024 * 1024; -- 50MB
    window_duration INTERVAL := '1 hour';
    current_window_start TIMESTAMPTZ;
    is_premium BOOLEAN := FALSE;
BEGIN
    -- Check if user is premium
    SELECT 
        (plan_type = 'premium' AND 
         (premium_expires_at IS NULL OR premium_expires_at > NOW()))
    INTO is_premium
    FROM profiles 
    WHERE user_id = p_user_id;
    
    -- Adjust limits for premium users
    IF is_premium THEN
        max_uploads_per_hour := 50;
        max_size_per_hour := 500 * 1024 * 1024; -- 500MB
    END IF;
    
    -- Calculate current window start
    current_window_start := DATE_TRUNC('hour', NOW());
    
    -- Get or create rate limit record
    SELECT * INTO rate_limit_row
    FROM upload_rate_limits
    WHERE user_id = p_user_id AND upload_type = p_upload_type;
    
    IF NOT FOUND THEN
        -- Create new record
        INSERT INTO upload_rate_limits (
            user_id, upload_type, uploads_count, window_start, 
            last_upload, total_size_bytes
        ) VALUES (
            p_user_id, p_upload_type, 1, current_window_start, 
            NOW(), p_file_size
        );
        
        RETURN jsonb_build_object(
            'allowed', true,
            'remaining_uploads', max_uploads_per_hour - 1,
            'remaining_size', max_size_per_hour - p_file_size,
            'window_reset', current_window_start + window_duration
        );
    END IF;
    
    -- Check if we need to reset the window
    IF rate_limit_row.window_start < current_window_start THEN
        -- Reset for new window
        UPDATE upload_rate_limits
        SET 
            uploads_count = 1,
            window_start = current_window_start,
            last_upload = NOW(),
            total_size_bytes = p_file_size,
            updated_at = NOW()
        WHERE user_id = p_user_id AND upload_type = p_upload_type;
        
        RETURN jsonb_build_object(
            'allowed', true,
            'remaining_uploads', max_uploads_per_hour - 1,
            'remaining_size', max_size_per_hour - p_file_size,
            'window_reset', current_window_start + window_duration
        );
    END IF;
    
    -- Check limits
    IF rate_limit_row.uploads_count >= max_uploads_per_hour THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'Upload count limit exceeded',
            'remaining_uploads', 0,
            'remaining_size', max_size_per_hour - rate_limit_row.total_size_bytes,
            'window_reset', rate_limit_row.window_start + window_duration
        );
    END IF;
    
    IF rate_limit_row.total_size_bytes + p_file_size > max_size_per_hour THEN
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'Upload size limit exceeded',
            'remaining_uploads', max_uploads_per_hour - rate_limit_row.uploads_count,
            'remaining_size', max_size_per_hour - rate_limit_row.total_size_bytes,
            'window_reset', rate_limit_row.window_start + window_duration
        );
    END IF;
    
    -- Update the record
    UPDATE upload_rate_limits
    SET 
        uploads_count = uploads_count + 1,
        last_upload = NOW(),
        total_size_bytes = total_size_bytes + p_file_size,
        updated_at = NOW()
    WHERE user_id = p_user_id AND upload_type = p_upload_type;
    
    RETURN jsonb_build_object(
        'allowed', true,
        'remaining_uploads', max_uploads_per_hour - (rate_limit_row.uploads_count + 1),
        'remaining_size', max_size_per_hour - (rate_limit_row.total_size_bytes + p_file_size),
        'window_reset', rate_limit_row.window_start + window_duration
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up old rate limit records
CREATE OR REPLACE FUNCTION cleanup_old_upload_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM upload_rate_limits
    WHERE window_start < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get upload statistics
CREATE OR REPLACE FUNCTION get_upload_statistics(
    p_days_back INTEGER DEFAULT 30
)
RETURNS JSONB AS $$
DECLARE
    stats JSONB;
BEGIN
    WITH upload_stats AS (
        SELECT
            COUNT(*) as total_uploads,
            COUNT(DISTINCT user_id) as unique_users,
            SUM(file_size) as total_size,
            AVG(file_size) as avg_file_size,
            upload_type,
            upload_status
        FROM upload_logs
        WHERE created_at >= NOW() - (p_days_back || ' days')::INTERVAL
        GROUP BY upload_type, upload_status
    ),
    security_stats AS (
        SELECT
            COUNT(*) as total_scans,
            COUNT(*) FILTER (WHERE array_length(threats_detected, 1) > 0) as threats_found,
            scan_type
        FROM file_security_scans fss
        JOIN upload_logs ul ON fss.upload_log_id = ul.id
        WHERE ul.created_at >= NOW() - (p_days_back || ' days')::INTERVAL
        GROUP BY scan_type
    ),
    quarantine_stats AS (
        SELECT
            COUNT(*) as quarantined_files,
            threat_level,
            admin_reviewed
        FROM upload_quarantine
        WHERE created_at >= NOW() - (p_days_back || ' days')::INTERVAL
        GROUP BY threat_level, admin_reviewed
    )
    SELECT jsonb_build_object(
        'period_days', p_days_back,
        'upload_stats', COALESCE(jsonb_agg(to_jsonb(upload_stats)), '[]'::jsonb),
        'security_stats', (
            SELECT COALESCE(jsonb_agg(to_jsonb(security_stats)), '[]'::jsonb)
            FROM security_stats
        ),
        'quarantine_stats', (
            SELECT COALESCE(jsonb_agg(to_jsonb(quarantine_stats)), '[]'::jsonb)
            FROM quarantine_stats
        ),
        'generated_at', NOW()
    ) INTO stats
    FROM upload_stats;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_upload_rate_limit TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_upload_rate_limits TO service_role;
GRANT EXECUTE ON FUNCTION get_upload_statistics TO service_role;

-- Create a trigger to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_upload_logs_updated_at
    BEFORE UPDATE ON upload_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_upload_rate_limits_updated_at
    BEFORE UPDATE ON upload_rate_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMIT;
