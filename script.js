document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, initializing app...');
    
    // Get main UI elements
    const startFilingBtn = document.querySelector('.start-filing-btn');
    const formContainer = document.querySelector('.form-container');
    const steps = document.querySelectorAll('.step');
    const formSteps = document.querySelectorAll('.form-step');
    const nextBtns = document.querySelectorAll('.next-btn');
    const prevBtns = document.querySelectorAll('.prev-btn');
    const form = document.getElementById('filing-form');
    
    console.log("Start filing button:", startFilingBtn);
    console.log("Form container:", formContainer);
    
    // Initialize variables
    let currentStep = 0;
    let paymentProcessed = false;
    let signaturePad;
    
    // If we have a start filing button, add click event
    if (startFilingBtn) {
        console.log("Adding click event to start filing button");
        startFilingBtn.addEventListener('click', function() {
            console.log("Start filing button clicked");
            if (formContainer) {
                formContainer.classList.remove('hidden');
                formContainer.scrollIntoView({ behavior: 'smooth' });
                console.log("Form container shown");
            } else {
                console.error("Form container not found");
            }
        });
    } else {
        console.error("Start filing button not found");
    }
    
    // Set up step navigation
    steps.forEach(step => {
        step.addEventListener('click', function(e) {
            e.preventDefault();
            const stepIndex = parseInt(this.getAttribute('data-step'));
            if (!isNaN(stepIndex)) {
                showStep(stepIndex);
            }
        });
    });
    
    // Set up next buttons
    nextBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            if (validateStep(currentStep)) {
                showStep(currentStep + 1);
            }
        });
    });
    
    // Set up previous buttons
    prevBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            showStep(currentStep - 1);
        });
    });
    
    // Initialize Stripe
    const stripePublicKey = 'pk_test_51LpCLtGInLr2DrSTQ8DDr3lvjrydsoKAHm2TRyXrbIHNlex0KAhZ6EhAOKGhStJgEocNVsblksuwgZ0ngd6ojvGr00Y59GqYhk'; // Test Stripe public key
    const stripe = Stripe(stripePublicKey);
    
    // Create an instance of Elements and mount the Card Element
    const elements = stripe.elements();
    const cardElement = elements.create('card', {
        style: {
            base: {
                color: '#32325d',
                fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
                fontSmoothing: 'antialiased',
                fontSize: '16px',
                '::placeholder': {
                    color: '#aab7c4'
                }
            },
            invalid: {
                color: '#fa755a',
                iconColor: '#fa755a'
            }
        }
    });
    
    // Initialize by showing the first step
    showStep(currentStep);
    
    // Function to show a specific step
    function showStep(index) {
        console.log(`Showing step ${index}`);
        
        // Validate index to ensure it's within valid range
        if (index < 0 || index >= formSteps.length) {
            console.error(`Invalid step index: ${index}`);
            return;
        }
        
        // Hide all steps
        formSteps.forEach(step => step.classList.add('hidden'));
        
        // Show the current step
        formSteps[index].classList.remove('hidden');
        
        // Update active step marker
        steps.forEach((step, i) => {
            if (i === index) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
        
        // Special initialization for different steps
        if (index === 1) { // Step 2 (Payment)
            console.log("Payment step shown, initializing card element...");
            setTimeout(initializeCardElement, 200);
        } else if (index === 2) { // Step 3 (Submit)
            console.log("Submit step shown, initializing signature pad...");
            if (!signaturePad) {
                initializeSignaturePad();
            }
        }
        
        // Update the current step
        currentStep = index;
    }
    
    // Function to validate the current step
    function validateStep(stepIndex) {
        const currentStepElement = formSteps[stepIndex];
        const requiredInputs = currentStepElement.querySelectorAll('input[required], select[required]');
        let isValid = true;
        
        requiredInputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.add('error');
                
                // Show validation error message if it exists
                const errorElement = input.closest('.form-group').querySelector('.validation-error');
                if (errorElement) {
                    errorElement.classList.add('show');
                }
                
                isValid = false;
            } else {
                input.classList.remove('error');
                
                // Hide validation error message if it exists
                const errorElement = input.closest('.form-group').querySelector('.validation-error');
                if (errorElement) {
                    errorElement.classList.remove('show');
                }
            }
        });
        
        // Additional validation for step 0 (Carrier Info)
        if (stepIndex === 0) {
            const confirmCheckbox = document.getElementById('confirmInfo');
            if (confirmCheckbox && !confirmCheckbox.checked) {
                confirmCheckbox.classList.add('error');
                const errorElement = confirmCheckbox.closest('.checkbox-group').querySelector('.validation-error');
                if (errorElement) {
                    errorElement.classList.add('show');
                }
                isValid = false;
            }
        }
        
        return isValid;
    }
    
    // Mount the card Element to the DOM
    function initializeCardElement() {
        console.log("Initializing card element...");
        if (document.getElementById('card-element')) {
            try {
                // First unmount if already mounted
                try {
                    cardElement.unmount();
                } catch (e) {
                    console.log("Card element not previously mounted");
                }
                
                // Now mount the card element
                cardElement.mount('#card-element');
                console.log("Card element mounted successfully");
                
                // Handle real-time validation errors from the card Element
                cardElement.on('change', function(event) {
                    const displayError = document.getElementById('card-errors');
                    if (event.error) {
                        displayError.textContent = event.error.message;
                        displayError.classList.add('show');
                    } else {
                        displayError.textContent = '';
                        displayError.classList.remove('show');
                    }
                });
            } catch (error) {
                console.error("Error mounting card element:", error);
                // Show error to user
                const displayError = document.getElementById('card-errors');
                if (displayError) {
                    displayError.textContent = "There was a problem loading the payment form. Please refresh the page and try again.";
                    displayError.classList.add('show');
                }
            }
        } else {
            console.warn("Card element container not found in the DOM");
        }
    }
    
    // Initialize the signature pad
    function initializeSignaturePad() {
        const canvas = document.getElementById('signatureCanvas');
        if (canvas) {
            signaturePad = new SignaturePad(canvas, {
                backgroundColor: 'rgba(255, 255, 255, 0)',
                penColor: 'black'
            });
            
            // Add clear button functionality
            const clearButton = document.getElementById('clearSignature');
            if (clearButton) {
                clearButton.addEventListener('click', function() {
                    signaturePad.clear();
                });
            }
        }
    }
    
    // Set up payment handling for next button in Step 2
    const paymentNextBtn = document.getElementById('payment-next-btn');
    if (paymentNextBtn) {
        paymentNextBtn.addEventListener('click', async function() {
            // If payment not yet processed, handle it before proceeding
            if (!paymentProcessed && currentStep === 1) { // Step 2 has index 1
                // Check if terms checkbox is checked
                const termsCheckbox = document.getElementById('payment-terms');
                if (termsCheckbox && !termsCheckbox.checked) {
                    termsCheckbox.classList.add('error');
                    const errorMsg = termsCheckbox.closest('.checkbox-group').querySelector('.validation-error');
                    if (errorMsg) {
                        errorMsg.classList.add('show');
                    }
                    return;
                }
                
                // Disable button during processing
                paymentNextBtn.disabled = true;
                paymentNextBtn.textContent = 'Processing...';
                
                try {
                    // Create a payment method with the card element
                    const {paymentMethod, error} = await stripe.createPaymentMethod({
                        type: 'card',
                        card: cardElement,
                        billing_details: {
                            name: document.getElementById('ownerName').value,
                            email: document.getElementById('email').value
                        }
                    });
                    
                    if (error) {
                        throw error;
                    }
                    
                    // Simulate payment success - in a real app, you would create a PaymentIntent on your server
                    const paymentData = {
                        id: paymentMethod.id,
                        amount: 15000, // $150.00
                        currency: 'usd',
                        status: 'succeeded',
                        timestamp: new Date().toISOString()
                    };
                    
                    // Store payment data for form submission
                    localStorage.setItem('boc3_payment_data', JSON.stringify(paymentData));
                    
                    // Mark payment as processed
                    paymentProcessed = true;
                    
                    // Show success message
                    const displayError = document.getElementById('card-errors');
                    if (displayError) {
                        displayError.textContent = 'Payment processed successfully!';
                        displayError.className = 'success';
                    }
                    
                    // Wait a moment for user to see success message, then proceed
                    setTimeout(function() {
                        showStep(currentStep + 1);
                        paymentNextBtn.disabled = false;
                        paymentNextBtn.textContent = 'Next';
                    }, 1500);
                    
                } catch (error) {
                    console.error('Payment error:', error);
                    
                    // Show error to user
                    const displayError = document.getElementById('card-errors');
                    if (displayError) {
                        displayError.textContent = error.message || 'An error occurred while processing your payment.';
                        displayError.classList.add('show');
                    }
                    
                    // Re-enable button
                    paymentNextBtn.disabled = false;
                    paymentNextBtn.textContent = 'Next';
                }
            } else {
                // Payment already processed, just go to next step
                showStep(currentStep + 1);
            }
        });
    }
    
    // Handle form submission
    if (form) {
        console.log("Setting up form submission handler for form:", form);
        
        // Add click handler for submit button as a fallback
        const submitBtn = document.querySelector('.submit-btn');
        if (submitBtn) {
            console.log("Found submit button, adding click handler");
            submitBtn.addEventListener('click', function(e) {
                console.log("Submit button clicked");
                // Prevent double submission
                if (submitBtn.disabled) {
                    console.log("Submit button is disabled, preventing submission");
                    e.preventDefault();
                    return;
                }
                
                // If form exists, manually trigger form submission
                if (form) {
                    console.log("Manually triggering form submission");
                    form.dispatchEvent(new Event('submit'));
                }
            });
        } else {
            console.warn("Submit button not found in the DOM");
        }
        
        form.addEventListener('submit', async function(e) {
            console.log("Form submission event triggered");
            e.preventDefault();
            
            // Validate current step before submission
            if (!validateStep(currentStep)) {
                console.log("Step validation failed, stopping submission");
                return;
            }
            
            // Disable submit button to prevent multiple submissions
            const submitBtn = document.querySelector('.submit-btn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Processing...';
            }
            
            try {
                // Get payment data from localStorage
                const paymentData = JSON.parse(localStorage.getItem('boc3_payment_data'));
                if (!paymentData || !paymentData.id) {
                    alert('Payment information is missing. Please complete the payment step first.');
                    
                    // Re-enable submit button
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Submit';
                    }
                    
                    return;
                }
                
                // Get form data
                const formData = {
                    usdot: document.getElementById('usdot').value,
                    ownerName: document.getElementById('ownerName').value,
                    email: document.getElementById('email').value,
                    phone: document.getElementById('phone').value,
                    companyName: document.getElementById('companyName').value,
                    address: {
                        street: document.getElementById('streetAddress').value,
                        city: document.getElementById('city').value,
                        state: document.getElementById('state').value,
                        zip: document.getElementById('zipCode').value
                    },
                    initials: {
                        initials1: document.getElementById('initials1') ? document.getElementById('initials1').value : '',
                        initials2: document.getElementById('initials2') ? document.getElementById('initials2').value : '',
                        initials3: document.getElementById('initials3') ? document.getElementById('initials3').value : '',
                        initials4: document.getElementById('initials4') ? document.getElementById('initials4').value : '',
                        initials5: document.getElementById('initials5') ? document.getElementById('initials5').value : ''
                    },
                    preferences: {
                        emailNotifications: document.getElementById('emailNotifications') ? document.getElementById('emailNotifications').checked : false,
                        marketingEmails: document.getElementById('marketingEmails') ? document.getElementById('marketingEmails').checked : false
                    },
                    payment: paymentData,
                    submittedDate: new Date().toISOString()
                };
                
                // Get signature data
                if (signaturePad && !signaturePad.isEmpty()) {
                    formData.signatureDataUrl = signaturePad.toDataURL();
                } else {
                    alert('Please sign the form before submitting.');
                    
                    // Re-enable submit button
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Submit';
                    }
                    
                    return;
                }
                
                // Send data to server
                console.log('Submission data:', formData);
                alert('Form submitted successfully! In a real implementation, this data would be sent to the server.');
                
                // Replace form with success message
                const successMessage = document.createElement('div');
                successMessage.className = 'success-message';
                successMessage.innerHTML = `
                    <h2>Thank You!</h2>
                    <p>Your BOC-3 filing has been submitted successfully.</p>
                    <p>A confirmation email has been sent to <strong>${formData.email}</strong>.</p>
                    <p>Your USDOT#: <strong>${formData.usdot}</strong></p>
                    <div id="redirect-timer">You will be redirected to the homepage in <span id="countdown">5</span> seconds.</div>
                    <button id="skip-button">Skip to Homepage</button>
                `;
                
                if (form.parentNode) {
                    form.parentNode.replaceChild(successMessage, form);
                }
                
                // Set up countdown timer
                let countdown = 5;
                const countdownEl = document.getElementById('countdown');
                const countdownInterval = setInterval(() => {
                    countdown--;
                    if (countdownEl) countdownEl.textContent = countdown;
                    if (countdown <= 0) {
                        clearInterval(countdownInterval);
                        window.location.href = '/';
                    }
                }, 1000);
                
                // Set up skip button
                const skipButton = document.getElementById('skip-button');
                if (skipButton) {
                    skipButton.addEventListener('click', () => {
                        clearInterval(countdownInterval);
                        window.location.href = '/';
                    });
                }
                
            } catch (error) {
                console.error('Submission error:', error);
                alert('There was an error submitting your form. Please try again later.');
                
                // Re-enable submit button
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Submit';
                }
            }
        });
    }
    
    // Handle billing address toggle
    const sameAddressCheckbox = document.getElementById('sameAsPhysical');
    const billingAddressSection = document.getElementById('billingAddressFields');
    
    if (sameAddressCheckbox && billingAddressSection) {
        sameAddressCheckbox.addEventListener('change', function() {
            billingAddressSection.classList.toggle('hidden', this.checked);
            
            // Toggle required attribute on billing address fields
            const billingInputs = billingAddressSection.querySelectorAll('input');
            billingInputs.forEach(input => {
                input.required = !this.checked;
            });
        });
    }
    
    // Test Supabase connection
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

// Load Supabase client
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

// Helper function to convert base64 to Blob
function b64toBlob(b64Data, contentType = '', sliceSize = 512) {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);
        
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    
    return new Blob(byteArrays, {type: contentType});
}
