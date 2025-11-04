-- Fix Guest Download Tracking
-- Allow NULL user_id in downloads table for guest downloads

-- Drop the problematic policy that blocks guest downloads
DROP POLICY IF EXISTS "users_can_insert_own_downloads" ON downloads;

-- Recreate the policy to properly handle guest downloads
-- Allow users to insert their own downloads OR insert with NULL user_id (guest downloads)
CREATE POLICY "users_can_insert_downloads"
ON downloads
FOR INSERT
TO public
WITH CHECK (
  -- Either the user is inserting their own download
  auth.uid() = user_id
  OR
  -- Or it's a guest download (NULL user_id) from an authenticated session
  (user_id IS NULL AND auth.role() = 'authenticated')
  OR
  -- Or it's from service_role (edge functions)
  auth.role() = 'service_role'
);

-- Ensure admin analytics queries include guest downloads
COMMENT ON TABLE downloads IS 'Download tracking table. Includes both authenticated (user_id set) and guest (user_id NULL) downloads.';
