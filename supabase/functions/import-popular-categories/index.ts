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

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Comprehensive popular categories
        const popularCategories = [
            // Animals
            'Butterfly', 'Wolf', 'Cat', 'Dog', 'Gorilla', 'Cute panda', 'Leopard print', 'Tiger', 'Eagle',
            'Elephant', 'Lion', 'Bear', 'Horse', 'Dolphin', 'Shark', 'Snake', 'Birds', 'Fish', 'Rabbit',
            'Fox', 'Deer', 'Owl', 'Penguin', 'Monkey', 'Wild animals', 'Pet animals', 'Zoo animals',
            
            // Characters & Anime
            'Kuromi', 'Cinnamoroll', 'Itachi', 'My melody', 'Hello Kitty', 'Naruto', 'Dragon Ball',
            'One Piece', 'Attack on Titan', 'Demon Slayer', 'Pokemon', 'Studio Ghibli', 'Disney',
            'Anime girls', 'Anime boys', 'Kawaii', 'Chibi', 'Manga', 'Otaku',
            
            // Brands & Tech
            'Supreme', 'Versace', 'Razer', 'MSI', 'BMW', 'OnePlus', 'Apple', 'Samsung', 'Nike',
            'Adidas', 'Gucci', 'Louis Vuitton', 'Off White', 'PlayStation', 'Xbox', 'Nintendo',
            'Tesla', 'Ferrari', 'Lamborghini', 'Mercedes', 'Audi', 'Porsche',
            
            // Movies & TV
            'Marvel', 'Spiderman', 'Batman', 'Superman', 'Avengers', 'Iron Man', 'Captain America',
            'Thor', 'Hulk', 'Wonder Woman', 'Joker', 'Deadpool', 'X-Men', 'Star Wars', 'Harry Potter',
            'Game of Thrones', 'Breaking Bad', 'Stranger Things', 'The Office', 'Friends',
            
            // Gaming
            'Overwatch', 'League of Legends', 'Valorant', 'Brawl Stars', 'Fortnite', 'PUBG',
            'Call of Duty', 'Minecraft', 'Among Us', 'Fall Guys', 'Apex Legends', 'Counter Strike',
            'Dota 2', 'World of Warcraft', 'FIFA', 'GTA', 'Cyberpunk', 'Assassin Creed',
            
            // Aesthetic & Vibes
            'Pink aesthetic', 'Purple aesthetic', 'Blue aesthetic', 'Dark aesthetic', 'Minimalist',
            'Vintage', 'Retro', 'Vaporwave', 'Synthwave', 'Lo-fi', 'Cottagecore', 'Dark academia',
            'Y2K', 'Grunge', 'Pastel', 'Neon', 'Glitter', 'Marble', 'Gold', 'Rose gold',
            
            // Nature & Landscapes
            'Mountains', 'Ocean', 'Forest', 'Desert', 'Sunset', 'Sunrise', 'Beach', 'Waterfall',
            'Lake', 'River', 'Flowers', 'Trees', 'Sky', 'Clouds', 'Rainbow', 'Snow', 'Rain',
            'Autumn', 'Spring', 'Summer', 'Winter', 'Tropical', 'Garden', 'Jungle',
            
            // Space & Sci-Fi
            'Galaxy', 'Nebula', 'Planets', 'Stars', 'Moon', 'Sun', 'Space', 'Astronaut',
            'Rocket', 'UFO', 'Alien', 'Sci-fi', 'Cyberpunk', 'Futuristic', 'Robot', 'AI',
            
            // Abstract & Art
            'Abstract', 'Geometric', 'Mandala', 'Fractal', 'Digital art', 'Painting', 'Sketch',
            'Watercolor', 'Oil painting', 'Street art', 'Pop art', 'Modern art', 'Classical art',
            
            // Colors
            'Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Purple', 'Pink',
            'Gray', 'Brown', 'Turquoise', 'Magenta', 'Lime', 'Navy', 'Maroon', 'Teal',
            
            // Patterns & Textures
            'Stripes', 'Polka dots', 'Chevron', 'Damask', 'Paisley', 'Floral', 'Wood',
            'Metal', 'Stone', 'Fabric', 'Leather', 'Paper', 'Glass', 'Water', 'Fire',
            
            // Lifestyle & Hobbies
            'Music', 'Guitar', 'Piano', 'DJ', 'Headphones', 'Vinyl', 'Concert', 'Dance',
            'Fitness', 'Yoga', 'Gym', 'Sports', 'Football', 'Basketball', 'Soccer', 'Baseball',
            'Tennis', 'Golf', 'Skateboard', 'Surfing', 'Snowboard', 'Motorcycle', 'Car',
            
            // Food & Drinks
            'Coffee', 'Tea', 'Wine', 'Beer', 'Cocktail', 'Pizza', 'Burger', 'Ice cream',
            'Cake', 'Fruit', 'Chocolate', 'Sushi', 'Pasta', 'Healthy food',
            
            // Occasions & Holidays
            'Christmas', 'Halloween', 'Valentine', 'New Year', 'Birthday', 'Wedding',
            'Easter', 'Thanksgiving', 'Independence Day', 'Summer vacation', 'Party',
            
            // Inspirational & Quotes
            'Motivational', 'Inspirational', 'Love quotes', 'Life quotes', 'Success',
            'Dreams', 'Goals', 'Positive vibes', 'Mindfulness', 'Peace', 'Hope'
        ];

        // Get existing categories to avoid duplicates
        const existingResponse = await fetch(`${supabaseUrl}/rest/v1/categories?select=name`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        const existingCategories = existingResponse.ok ? await existingResponse.json() : [];
        const existingNames = new Set(existingCategories.map((cat: any) => cat.name.toLowerCase()));

        // Filter out duplicates
        const newCategories = popularCategories.filter(name => 
            !existingNames.has(name.toLowerCase())
        );

        console.log(`Importing ${newCategories.length} new categories`);

        // Import categories in batches
        const batchSize = 10;
        let imported = 0;
        
        for (let i = 0; i < newCategories.length; i += batchSize) {
            const batch = newCategories.slice(i, i + batchSize);
            const categoriesToInsert = batch.map((name, index) => {
                const slug = name.toLowerCase()
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/^-+|-+$/g, '');
                
                return {
                    name,
                    slug,
                    description: `${name} wallpapers and backgrounds`,
                    sort_order: 1000 + i + index, // Place after existing categories
                    is_active: true,
                    level: 0,
                    is_premium: false
                };
            });

            const insertResponse = await fetch(`${supabaseUrl}/rest/v1/categories`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(categoriesToInsert)
            });

            if (insertResponse.ok) {
                imported += batch.length;
                console.log(`Imported batch ${Math.floor(i / batchSize) + 1}`);
            } else {
                console.error(`Failed to import batch ${Math.floor(i / batchSize) + 1}:`, await insertResponse.text());
            }
        }

        return new Response(JSON.stringify({
            data: {
                message: `Successfully imported ${imported} new popular categories`,
                imported,
                skipped: popularCategories.length - newCategories.length,
                total: popularCategories.length
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Import categories error:', error);

        const errorResponse = {
            error: {
                code: 'IMPORT_CATEGORIES_ERROR',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});