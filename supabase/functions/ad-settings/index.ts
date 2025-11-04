Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const { action, ...data } = await req.json();

        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase configuration missing');
        }

        if (action === 'get') {
            // Get current ad settings
            const response = await fetch(`${supabaseUrl}/rest/v1/ad_settings?select=*&order=created_at.desc&limit=1`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch ad settings');
            }

            const settings = await response.json();
            
            if (settings.length === 0) {
                // Return default settings if none exist
                const defaultSettings = {
                    id: 0,
                    countdown_duration: 8,
                    ad_title: 'Support Us',
                    ad_description: 'Please wait while we prepare your download...',
                    ad_image_url: null,
                    is_active: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                
                return new Response(JSON.stringify({ data: defaultSettings }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            return new Response(JSON.stringify({ data: settings[0] }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (action === 'get_guest') {
            // Get current guest ad settings
            const response = await fetch(`${supabaseUrl}/rest/v1/guest_ad_settings?select=*&order=created_at.desc&limit=1`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch guest ad settings');
            }

            const settings = await response.json();
            
            if (settings.length === 0) {
                // Return default settings if none exist
                const defaultSettings = {
                    id: 0,
                    guest_ad_active: true,
                    guest_timer_duration: 8,
                    guest_ad_content_type: 'image_upload',
                    guest_ad_image_url: null,
                    guest_ad_external_url: null,
                    guest_ad_html_content: null,
                    guest_ad_click_url: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                
                return new Response(JSON.stringify({ data: defaultSettings }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            return new Response(JSON.stringify({ data: settings[0] }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (action === 'update_guest') {
            // Update or create guest ad settings
            const { 
                guest_ad_active, 
                guest_timer_duration, 
                guest_ad_content_type, 
                guest_ad_image_url, 
                guest_ad_external_url, 
                guest_ad_html_content,
                guest_ad_click_url
            } = data;

            // Validate input
            if (guest_timer_duration < 3 || guest_timer_duration > 60) {
                throw new Error('Timer duration must be between 3 and 60 seconds');
            }

            if (!['image_upload', 'external_url', 'html_adsense'].includes(guest_ad_content_type)) {
                throw new Error('Invalid content type');
            }

            // Sanitize HTML content if provided
            let sanitizedHtmlContent = guest_ad_html_content;
            if (guest_ad_content_type === 'html_adsense' && guest_ad_html_content) {
                // Basic HTML sanitization
                sanitizedHtmlContent = guest_ad_html_content
                    .replace(/<script[^>]*>.*?<\/script>/gi, '')
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+="[^"]*"/gi, '');
                
                if (sanitizedHtmlContent.length > 10000) {
                    throw new Error('HTML content too large (maximum 10KB)');
                }
            }

            const settingsData = {
                guest_ad_active: Boolean(guest_ad_active),
                guest_timer_duration: parseInt(guest_timer_duration),
                guest_ad_content_type: guest_ad_content_type,
                guest_ad_image_url: guest_ad_image_url || null,
                guest_ad_external_url: guest_ad_external_url || null,
                guest_ad_html_content: sanitizedHtmlContent || null,
                guest_ad_click_url: guest_ad_click_url || null,
                updated_at: new Date().toISOString()
            };

            // Check if settings exist
            const existingResponse = await fetch(`${supabaseUrl}/rest/v1/guest_ad_settings?select=id&order=created_at.desc&limit=1`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Accept': 'application/json'
                }
            });

            if (existingResponse.ok) {
                const existing = await existingResponse.json();
                
                if (existing.length > 0) {
                    // Update existing settings
                    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/guest_ad_settings?id=eq.${existing[0].id}`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify(settingsData)
                    });

                    if (!updateResponse.ok) {
                        const errorText = await updateResponse.text();
                        console.error('Update error:', errorText);
                        throw new Error('Failed to update guest ad settings');
                    }

                    const updatedSettings = await updateResponse.json();
                    return new Response(JSON.stringify({ data: updatedSettings[0] }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }
            }

            // Create new settings if none exist
            settingsData.created_at = new Date().toISOString();
            
            const createResponse = await fetch(`${supabaseUrl}/rest/v1/guest_ad_settings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(settingsData)
            });

            if (!createResponse.ok) {
                const errorText = await createResponse.text();
                console.error('Create error:', errorText);
                throw new Error('Failed to create guest ad settings');
            }

            const newSettings = await createResponse.json();
            return new Response(JSON.stringify({ data: newSettings[0] }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (action === 'get_logged_in') {
            // Get current logged-in non-premium ad settings
            const response = await fetch(`${supabaseUrl}/rest/v1/logged_in_ad_settings?select=*&order=created_at.desc&limit=1`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch logged-in ad settings');
            }

            const settings = await response.json();
            
            if (settings.length === 0) {
                // Return default settings if none exist
                const defaultSettings = {
                    id: 0,
                    logged_in_ad_active: true,
                    logged_in_timer_duration: 5,
                    logged_in_ad_content_type: 'image_upload',
                    logged_in_ad_image_url: null,
                    logged_in_ad_external_url: null,
                    logged_in_ad_html_content: null,
                    logged_in_ad_click_url: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                
                return new Response(JSON.stringify({ data: defaultSettings }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            return new Response(JSON.stringify({ data: settings[0] }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (action === 'update_logged_in') {
            // Update or create logged-in non-premium ad settings
            const { 
                logged_in_ad_active, 
                logged_in_timer_duration, 
                logged_in_ad_content_type, 
                logged_in_ad_image_url, 
                logged_in_ad_external_url, 
                logged_in_ad_html_content,
                logged_in_ad_click_url
            } = data;

            // Validate input
            if (logged_in_timer_duration < 3 || logged_in_timer_duration > 60) {
                throw new Error('Timer duration must be between 3 and 60 seconds');
            }

            if (!['image_upload', 'external_url', 'html_adsense'].includes(logged_in_ad_content_type)) {
                throw new Error('Invalid content type');
            }

            // Sanitize HTML content if provided
            let sanitizedHtmlContent = logged_in_ad_html_content;
            if (logged_in_ad_content_type === 'html_adsense' && logged_in_ad_html_content) {
                // Basic HTML sanitization
                sanitizedHtmlContent = logged_in_ad_html_content
                    .replace(/<script[^>]*>.*?<\/script>/gi, '')
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+="[^"]*"/gi, '');
                
                if (sanitizedHtmlContent.length > 10000) {
                    throw new Error('HTML content too large (maximum 10KB)');
                }
            }

            const settingsData = {
                logged_in_ad_active: Boolean(logged_in_ad_active),
                logged_in_timer_duration: parseInt(logged_in_timer_duration),
                logged_in_ad_content_type: logged_in_ad_content_type,
                logged_in_ad_image_url: logged_in_ad_image_url || null,
                logged_in_ad_external_url: logged_in_ad_external_url || null,
                logged_in_ad_html_content: sanitizedHtmlContent || null,
                logged_in_ad_click_url: logged_in_ad_click_url || null,
                updated_at: new Date().toISOString()
            };

            // Check if settings exist
            const existingResponse = await fetch(`${supabaseUrl}/rest/v1/logged_in_ad_settings?select=id&order=created_at.desc&limit=1`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Accept': 'application/json'
                }
            });

            if (existingResponse.ok) {
                const existing = await existingResponse.json();
                
                if (existing.length > 0) {
                    // Update existing settings
                    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/logged_in_ad_settings?id=eq.${existing[0].id}`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify(settingsData)
                    });

                    if (!updateResponse.ok) {
                        const errorText = await updateResponse.text();
                        console.error('Update error:', errorText);
                        throw new Error('Failed to update logged-in ad settings');
                    }

                    const updatedSettings = await updateResponse.json();
                    return new Response(JSON.stringify({ data: updatedSettings[0] }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }
            }

            // Create new settings if none exist
            settingsData.created_at = new Date().toISOString();
            
            const createResponse = await fetch(`${supabaseUrl}/rest/v1/logged_in_ad_settings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(settingsData)
            });

            if (!createResponse.ok) {
                const errorText = await createResponse.text();
                console.error('Create error:', errorText);
                throw new Error('Failed to create logged-in ad settings');
            }

            const newSettings = await createResponse.json();
            return new Response(JSON.stringify({ data: newSettings[0] }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (action === 'update') {
            // Update or create ad settings
            const { countdown_duration, ad_title, ad_description, ad_image_url, is_active } = data;

            // Validate input
            if (countdown_duration < 1 || countdown_duration > 30) {
                throw new Error('Countdown duration must be between 1 and 30 seconds');
            }

            if (!ad_title || ad_title.trim().length === 0) {
                throw new Error('Ad title is required');
            }

            if (!ad_description || ad_description.trim().length === 0) {
                throw new Error('Ad description is required');
            }

            const settingsData = {
                countdown_duration: parseInt(countdown_duration),
                ad_title: ad_title.trim(),
                ad_description: ad_description.trim(),
                ad_image_url: ad_image_url || null,
                is_active: Boolean(is_active),
                updated_at: new Date().toISOString()
            };

            // Check if settings exist
            const existingResponse = await fetch(`${supabaseUrl}/rest/v1/ad_settings?select=id&order=created_at.desc&limit=1`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Accept': 'application/json'
                }
            });

            if (existingResponse.ok) {
                const existing = await existingResponse.json();
                
                if (existing.length > 0) {
                    // Update existing settings
                    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/ad_settings?id=eq.${existing[0].id}`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify(settingsData)
                    });

                    if (!updateResponse.ok) {
                        throw new Error('Failed to update ad settings');
                    }

                    const updatedSettings = await updateResponse.json();
                    return new Response(JSON.stringify({ data: updatedSettings[0] }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }
            }

            // Create new settings if none exist
            settingsData.created_at = new Date().toISOString();
            
            const createResponse = await fetch(`${supabaseUrl}/rest/v1/ad_settings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(settingsData)
            });

            if (!createResponse.ok) {
                throw new Error('Failed to create ad settings');
            }

            const newSettings = await createResponse.json();
            return new Response(JSON.stringify({ data: newSettings[0] }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else {
            throw new Error('Invalid action');
        }

    } catch (error) {
        console.error('Ad settings error:', error);

        const errorResponse = {
            error: {
                code: 'AD_SETTINGS_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});