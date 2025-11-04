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
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        const requestData = await req.json();
        const { batch_size = 5, action = 'migrate_batch' } = requestData;

        // Get categories for organized paths
        const categoriesResponse = await fetch(`${supabaseUrl}/rest/v1/categories?select=id,name,slug`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Accept': 'application/json'
            }
        });

        let categories = [];
        if (categoriesResponse.ok) {
            categories = await categoriesResponse.json();
        }
        const categoryMap = categories.reduce((map, cat) => {
            map[cat.id] = cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
            return map;
        }, {});

        // Get unmigrated wallpapers with category info
        const wallpapersResponse = await fetch(`${supabaseUrl}/rest/v1/wallpapers?select=*&migrated_to_storage=eq.false&is_published=eq.true&is_active=eq.true&limit=${batch_size}`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Accept': 'application/json'
            }
        });

        if (!wallpapersResponse.ok) {
            throw new Error(`Failed to fetch wallpapers: ${wallpapersResponse.status}`);
        }

        const wallpapers = await wallpapersResponse.json();

        if (!wallpapers?.length) {
            return new Response(JSON.stringify({
                message: 'No wallpapers to migrate',
                data: { processed: 0, success_count: 0, error_count: 0 }
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const results = [];
        console.log(`Starting optimized migration for ${wallpapers.length} wallpapers`);

        for (const wallpaper of wallpapers) {
            try {
                console.log(`Migrating wallpaper ${wallpaper.id}: ${wallpaper.title}`);

                // Determine category path
                const categoryPath = wallpaper.category_id && categoryMap[wallpaper.category_id] 
                    ? categoryMap[wallpaper.category_id] 
                    : 'uncategorized';

                // Download original image
                const originalResponse = await fetch(wallpaper.image_url, {
                    headers: { 'User-Agent': 'Supabase-Storage-Migration/1.0' }
                });
                
                if (!originalResponse.ok) {
                    throw new Error(`Failed to download original: ${originalResponse.status}`);
                }
                
                const originalBuffer = await originalResponse.arrayBuffer();
                console.log(`Downloaded image, size: ${originalBuffer.byteLength} bytes`);

                // Create organized file paths
                const originalPath = `original/${categoryPath}/${wallpaper.id}.jpg`;
                const previewPath = `preview/${categoryPath}/${wallpaper.id}.webp`;
                const thumbnailPath = `thumbnails/${categoryPath}/${wallpaper.id}.webp`;

                // Process and upload original (full resolution)
                console.log('Uploading original...');
                const originalUploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/wallpapers/${originalPath}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'image/jpeg',
                        'x-upsert': 'true'
                    },
                    body: originalBuffer
                });

                if (!originalUploadResponse.ok) {
                    const errorText = await originalUploadResponse.text();
                    console.error('Original upload failed:', errorText);
                    throw new Error(`Failed to upload original: ${originalUploadResponse.status} - ${errorText}`);
                }

                // Generate watermarked preview (1024px max width)
                const previewBuffer = await createWatermarkedPreview(originalBuffer);
                console.log('Uploading preview...');
                const previewUploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/wallpapers-preview/${previewPath}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'image/webp',
                        'x-upsert': 'true'
                    },
                    body: previewBuffer
                });

                if (!previewUploadResponse.ok) {
                    const errorText = await previewUploadResponse.text();
                    console.error('Preview upload failed:', errorText);
                    throw new Error(`Failed to upload preview: ${previewUploadResponse.status} - ${errorText}`);
                }

                // Generate thumbnail (400px max width)
                const thumbnailBuffer = await createThumbnail(originalBuffer);
                console.log('Uploading thumbnail...');
                const thumbnailUploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/wallpapers-thumbnails/${thumbnailPath}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'image/webp',
                        'x-upsert': 'true'
                    },
                    body: thumbnailBuffer
                });

                if (!thumbnailUploadResponse.ok) {
                    const errorText = await thumbnailUploadResponse.text();
                    console.error('Thumbnail upload failed:', errorText);
                    throw new Error(`Failed to upload thumbnail: ${thumbnailUploadResponse.status} - ${errorText}`);
                }

                // Update wallpaper record with new paths
                const updateResponse = await fetch(`${supabaseUrl}/rest/v1/wallpapers?id=eq.${wallpaper.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        migrated_to_storage: true,
                        original_file_path: originalPath,
                        preview_file_path: previewPath,
                        thumbnail_url: `${supabaseUrl}/storage/v1/object/public/wallpapers-thumbnails/${thumbnailPath}`,
                        updated_at: new Date().toISOString()
                    })
                });

                if (!updateResponse.ok) {
                    const errorText = await updateResponse.text();
                    throw new Error(`Failed to update record: ${updateResponse.status} - ${errorText}`);
                }

                results.push({
                    id: wallpaper.id,
                    title: wallpaper.title,
                    category: categoryPath,
                    status: 'success',
                    paths: {
                        original: originalPath,
                        preview: previewPath,
                        thumbnail: thumbnailPath
                    }
                });

                console.log(`✅ Successfully migrated wallpaper ${wallpaper.id}`);

            } catch (error) {
                console.error(`❌ Failed to migrate wallpaper ${wallpaper.id}:`, error);
                results.push({
                    id: wallpaper.id,
                    title: wallpaper.title,
                    status: 'error',
                    error: error.message
                });
            }
        }

        const successCount = results.filter(r => r.status === 'success').length;
        const errorCount = results.filter(r => r.status === 'error').length;

        return new Response(JSON.stringify({
            data: {
                batch_size,
                processed: results.length,
                success_count: successCount,
                error_count: errorCount,
                results: results,
                migration_summary: {
                    remaining: Math.max(0, 128 - successCount), // Approximate
                    completion_percentage: Math.round((successCount / Math.max(wallpapers.length, 1)) * 100)
                }
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Migration error:', error);
        return new Response(JSON.stringify({
            error: 'Migration failed',
            message: error.message
        }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Image processing functions
async function createWatermarkedPreview(imageBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    try {
        // First try with the original buffer
        const imageBlob = new Blob([imageBuffer]);
        const imageBitmap = await createImageBitmap(imageBlob);
        
        // Calculate dimensions (max width 1024px for preview)
        const maxWidth = 1024;
        const originalWidth = imageBitmap.width;
        const originalHeight = imageBitmap.height;
        
        let newWidth = originalWidth;
        let newHeight = originalHeight;
        
        if (originalWidth > maxWidth) {
            newWidth = maxWidth;
            newHeight = (originalHeight * maxWidth) / originalWidth;
        }
        
        // Create canvas
        const canvas = new OffscreenCanvas(newWidth, newHeight);
        const ctx = canvas.getContext('2d')!;
        
        // Draw image
        ctx.drawImage(imageBitmap, 0, 0, newWidth, newHeight);
        
        // Add watermark
        const watermarkText = 'BestFreeWallpapers.com';
        const fontSize = Math.max(16, Math.floor(newWidth / 40));
        
        ctx.font = `${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 1;
        
        // Position watermark at bottom right
        const textMetrics = ctx.measureText(watermarkText);
        const textWidth = textMetrics.width;
        
        const x = newWidth - textWidth - 20;
        const y = newHeight - 20;
        
        // Draw watermark with outline
        ctx.strokeText(watermarkText, x, y);
        ctx.fillText(watermarkText, x, y);
        
        // Convert to WebP
        const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
        return await blob.arrayBuffer();
        
    } catch (error) {
        console.error('Watermarking failed, using resized original:', error);
        return resizeImage(imageBuffer, 1024, 'webp');
    }
}

async function createThumbnail(imageBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    return resizeImage(imageBuffer, 400, 'webp');
}

async function resizeImage(imageBuffer: ArrayBuffer, maxWidth: number, format: string): Promise<ArrayBuffer> {
    try {
        // Create blob without specifying MIME type, let browser detect
        const imageBlob = new Blob([imageBuffer]);
        const imageBitmap = await createImageBitmap(imageBlob);
        
        const originalWidth = imageBitmap.width;
        const originalHeight = imageBitmap.height;
        
        let newWidth = originalWidth;
        let newHeight = originalHeight;
        
        if (originalWidth > maxWidth) {
            newWidth = maxWidth;
            newHeight = (originalHeight * maxWidth) / originalWidth;
        }
        
        const canvas = new OffscreenCanvas(newWidth, newHeight);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(imageBitmap, 0, 0, newWidth, newHeight);
        
        const mimeType = format === 'webp' ? 'image/webp' : 'image/jpeg';
        const quality = format === 'webp' ? 0.8 : 0.85;
        
        const blob = await canvas.convertToBlob({ type: mimeType, quality });
        return await blob.arrayBuffer();
    } catch (error) {
        console.error('Image resize failed:', error);
        // Fallback: return original buffer if all else fails
        return imageBuffer;
    }
}