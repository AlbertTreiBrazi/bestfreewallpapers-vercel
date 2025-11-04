-- Create contact_messages table for admin dashboard
CREATE TABLE IF NOT EXISTS contact_messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'replied', 'archived')),
    ip_address INET,
    user_agent TEXT,
    replied_at TIMESTAMP WITH TIME ZONE,
    replied_by UUID REFERENCES auth.users(id),
    admin_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_email ON contact_messages(email);

-- Insert sample contact messages for testing
INSERT INTO contact_messages (name, email, subject, message, status, created_at) 
VALUES
('John Doe', 'john@example.com', 'Love the wallpapers!', 'Thank you for providing such beautiful wallpapers for free. Keep up the great work!', 'unread', NOW() - INTERVAL '2 days'),
('Sarah Smith', 'sarah@test.com', 'Premium membership question', 'I am interested in the premium membership. What are the benefits?', 'read', NOW() - INTERVAL '5 days'),
('Mike Johnson', 'mike@email.com', 'Technical issue', 'I am having trouble downloading wallpapers. Can you help?', 'unread', NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- Set updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_contact_messages_updated_at ON contact_messages;
CREATE TRIGGER update_contact_messages_updated_at
    BEFORE UPDATE ON contact_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();