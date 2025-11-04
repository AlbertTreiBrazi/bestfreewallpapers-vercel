Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

        if (!supabaseUrl || !serviceRoleKey || !anonKey) {
            throw new Error('Supabase configuration missing');
        }

        // Authentication check
        const authToken = req.headers.get('authorization')?.replace('Bearer ', '');
        if (!authToken) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Verify user authentication
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'apikey': anonKey
            }
        });

        if (!userResponse.ok) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid authentication token',
                code: 'INVALID_TOKEN'
            }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const userData = await userResponse.json();
        const userId = userData.id;

        // Check if user is admin
        const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${userId}&select=is_admin,admin_role,admin_permissions`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (!profileResponse.ok) {
            throw new Error('Failed to verify admin status');
        }

        const profiles = await profileResponse.json();
        const profile = profiles[0];

        if (!profile || !profile.is_admin) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Admin access required',
                code: 'ADMIN_REQUIRED'
            }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Parse request data (avoiding race condition)
        const requestData = await req.json();
        const { action, collectionId, fileData, fileName, fileType } = requestData;

        if (action === 'upload_cover') {
            return await handleCoverUpload({
                collectionId,
                fileData,
                fileName,
                fileType,
                userId,
                supabaseUrl,
                serviceRoleKey,
                corsHeaders
            });
        } else {
            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid action',
                code: 'INVALID_ACTION'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

    } catch (error: any) {
        console.error('Collections cover upload error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Upload processing failed',
            details: error.message,
            code: 'PROCESSING_ERROR'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

async function handleCoverUpload(params: {
    collectionId: string;
    fileData: string;
    fileName: string;
    fileType: string;
    userId: string;
    supabaseUrl: string;
    serviceRoleKey: string;
    corsHeaders: Record<string, string>;
}) {
    const { collectionId, fileData, fileName, fileType, userId, supabaseUrl, serviceRoleKey, corsHeaders } = params;

    try {
        // Validate collection exists
        const collectionResponse = await fetch(`${supabaseUrl}/rest/v1/collections?id=eq.${collectionId}&select=id,name`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        const collections = await collectionResponse.json();
        if (!collections || collections.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Collection not found',
                code: 'COLLECTION_NOT_FOUND'
            }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Validate file
        const validation = await validateImage(fileData, fileName, fileType);
        if (!validation.valid) {
            return new Response(JSON.stringify({
                success: false,
                error: validation.error,
                code: 'VALIDATION_ERROR'
            }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        const extension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
        const safeFileName = `collection-cover-${collectionId}-${timestamp}-${randomId}.${extension}`;

        // Convert base64 to binary
        const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
        const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

        // Upload to storage
        const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/public-wallpapers/collections/${safeFileName}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'Content-Type': fileType,
                'Content-Length': binaryData.length.toString()
            },
            body: binaryData
        });

        if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            console.error('Storage upload failed:', errorText);
            throw new Error(`Storage upload failed: ${errorText}`);
        }

        // Generate public URL
        const publicUrl = `${supabaseUrl}/storage/v1/object/public/public-wallpapers/collections/${safeFileName}`;

        // Update collection with new cover image URL
        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/collections?id=eq.${collectionId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                cover_image_url: publicUrl,
                updated_at: new Date().toISOString()
            })
        });

        if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('Collection update failed:', errorText);
            throw new Error(`Failed to update collection: ${errorText}`);
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Collection cover uploaded successfully',
            data: {
                fileName: safeFileName,
                url: publicUrl,
                collectionId: collectionId
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('Cover upload error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Cover upload failed',
            details: error.message,
            code: 'UPLOAD_ERROR'
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
}

async function validateImage(fileData: string, fileName: string, fileType: string) {
    // File size validation (max 5MB)
    const base64Data = fileData.includes(',') ? fileData.split(',')[1] : fileData;
    const fileSize = (base64Data.length * 3) / 4; // Approximate binary size
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (fileSize > maxSize) {
        return {
            valid: false,
            error: `File too large. Maximum size: 5MB`
        };
    }

    // MIME type validation
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(fileType.toLowerCase())) {
        return {
            valid: false,
            error: `File type not allowed. Allowed types: JPEG, PNG, WebP`
        };
    }

    // Filename validation
    if (!fileName || fileName.length > 255) {
        return {
            valid: false,
            error: 'Invalid filename'
        };
    }

    return { valid: true };
}