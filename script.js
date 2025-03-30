document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, initializing app...');
    
    // Test Supabase connection on page load
    testSupabaseConnection();
});

// Function to test Supabase connection
async function testSupabaseConnection() {
    console.log("Testing Supabase connection...");
    try {
        const supabase = await loadSupabaseClient();
        if (!supabase) {
            console.error("Failed to load Supabase client during test");
            return;
        }
        
        // Try a simple query to test the connection
        const { data, error } = await supabase
            .from('boc3_submissions')
            .select('id')
            .limit(1);
            
        if (error) {
            console.error("Supabase test query failed:", error);
            console.log("Error details:", error.message, error.details);
        } else {
            console.log("Supabase connection test successful!");
            console.log("Test query result:", data);
        }
    } catch (err) {
        console.error("Unexpected error during Supabase connection test:", err);
    }
}

async function loadSupabaseClient() {
    return new Promise(async (resolve) => {
        try {
            console.log("loadSupabaseClient called");
            
            // Check if Supabase is already available in window object
            if (window.supabaseClient) {
                console.log("Supabase client already available in window.supabaseClient");
                resolve(window.supabaseClient);
                return;
            }
            
            const supabaseUrl = 'https://fedrwwuqzgdogvwmlugv.supabase.co';
            const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlZHJ3d3Vxemdkb2d2d21sdWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNDc4MDgsImV4cCI6MjA1ODkyMzgwOH0.yUbMKtFXI2l1tGdz3zvMzRWYzvwI66LeeBFzmYV-sUk';
            
            // Check if supabase is already loaded (global object from script tag)
            if (typeof supabase !== 'undefined') {
                console.log("Supabase library already loaded via script tag");
                
                try {
                    // Initialize the client with credentials
                    window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
                    console.log("Supabase client successfully initialized");
                    resolve(window.supabaseClient);
                    return;
                } catch (initError) {
                    console.error("Error initializing Supabase with existing library:", initError);
                    // Continue to alternative methods
                }
            }
            
            // If we got here, we need to load Supabase from CDN
            console.log("Loading Supabase JS SDK from CDN...");
            
            try {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
                script.async = true;
                document.head.appendChild(script);
                
                // Wait for script to load
                await new Promise((scriptResolve) => {
                    script.onload = () => {
                        console.log("Supabase JS SDK loaded from CDN");
                        scriptResolve();
                    };
                    script.onerror = (error) => {
                        console.error("Failed to load Supabase JS SDK:", error);
                        scriptResolve(); // Resolve anyway to continue
                    };
                });
                
                // Check if the library loaded properly
                if (typeof supabase === 'undefined') {
                    console.error("Supabase library failed to load properly");
                    
                    // Try one more time with a different CDN
                    const backupScript = document.createElement('script');
                    backupScript.src = 'https://unpkg.com/@supabase/supabase-js@2';
                    backupScript.async = true;
                    document.head.appendChild(backupScript);
                    
                    await new Promise((backupResolve) => {
                        backupScript.onload = () => {
                            console.log("Supabase JS SDK loaded from backup CDN");
                            backupResolve();
                        };
                        backupScript.onerror = () => {
                            console.error("Failed to load Supabase JS SDK from backup CDN");
                            backupResolve();
                        };
                    });
                }
                
                // Final check if library is available
                if (typeof supabase === 'undefined') {
                    console.error("All attempts to load Supabase library failed");
                    resolve(null);
                    return;
                }
                
                // Initialize the client with credentials
                window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
                console.log("Supabase client successfully initialized after loading library");
                resolve(window.supabaseClient);
            } catch (loadError) {
                console.error("Error during Supabase library loading:", loadError);
                resolve(null);
            }
        } catch (error) {
            console.error("Unexpected error in loadSupabaseClient:", error);
            resolve(null);
        }
    });
}

// Helper function to handle the actual upload with a client
async function uploadWithClient(supabase, formData, pdfDataUri) {
    try {
        console.log("uploadWithClient called with formData:", Object.keys(formData));
        
        // Extract base64 data from data URI
        const base64Data = pdfDataUri.split(',')[1];
        
        // Convert to blob for upload
        const pdfBlob = b64toBlob(base64Data, 'application/pdf');
        
        // Create a unique filename based on USDOT number and date
        const usdot = formData.usdot;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `BOC3_${usdot}_${timestamp}.pdf`;
        
        console.log("Preparing to upload file:", filename);
        console.log("File size:", Math.round(pdfBlob.size / 1024), "KB");
        
        // Upload to Supabase Storage
        console.log("Uploading file to Supabase storage...");
        const { data: fileData, error: uploadError } = await supabase.storage
            .from('boc3-filings')
            .upload(filename, pdfBlob, {
                cacheControl: '3600',
                contentType: 'application/pdf',
                upsert: true
            });
            
        if (uploadError) {
            console.error("Error uploading PDF:", uploadError);
            console.log("Error code:", uploadError.code);
            console.log("Error message:", uploadError.message);
            console.log("Error details:", uploadError.details);
            return false;
        }
        
        console.log("PDF successfully uploaded:", fileData.path);
        
        // Extract database fields from formData
        const record = {
            file_path: fileData.path,
            filename: filename,
            usdot: parseInt(formData.usdot) || 0,
            company_name: formData.companyName || '',
            owner_name: formData.ownerName || '',
            email: formData.email || '',
            phone: formData.phone || '',
            timestamp: new Date().toISOString(),
            status: 'submitted'
        };
        
        console.log("Preparing database record:", record);
        
        // Create a database record with metadata - using exact column names from the schema
        console.log("Inserting record into boc3_submissions table...");
        const { data: recordData, error: recordError } = await supabase
            .from('boc3_submissions')
            .insert([record]);
            
        if (recordError) {
            console.error("Error creating database record:", recordError);
            console.log("Error code:", recordError.code);
            console.log("Error message:", recordError.message);
            console.log("Error details:", recordError.details);
            console.log("Error hint:", recordError.hint);
            return false;
        }
        
        console.log("Database record created successfully:", recordData);
        return true;
    } catch (error) {
        console.error("Error in uploadWithClient:", error);
        console.error("Error stack:", error.stack);
        return false;
    }
}
