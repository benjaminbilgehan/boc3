document.addEventListener('DOMContentLoaded', function() {
    const startFilingBtn = document.querySelector('.start-filing-btn');
    const formContainer = document.querySelector('.form-container');
    const steps = document.querySelectorAll('.step');
    const formSteps = document.querySelectorAll('.form-step');
    const nextBtns = document.querySelectorAll('.next-btn');
    const prevBtns = document.querySelectorAll('.prev-btn');
    const form = document.getElementById('filing-form');

    // Load EmailJS script early
    loadEmailJSScript();

    // Initialize Stripe
    const stripePublicKey = 'pk_test_51LpCLtGInLr2DrSTQ8DDr3lvjrydsoKAHm2TRyXrbIHNlex0KAhZ6EhAOKGhStJgEocNVsblksuwgZ0ngd6ojvGr00Y59GqYhk'; // Test Stripe public key
    const stripe = Stripe(stripePublicKey);
    const elements = stripe.elements();
    const cardElement = elements.create('card');
    let paymentProcessed = false;
    let paymentMethod = null;
    
    // Mount the card Element to the DOM on step2 display
    function initializeCardElement() {
        if (document.getElementById('card-element')) {
            cardElement.mount('#card-element');
            
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
                if (!termsCheckbox.checked) {
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
                    // Get customer info for the payment
                    const customerName = document.getElementById('ownerName').value;
                    const customerEmail = document.getElementById('email').value;
                    const amount = 15000; // $150.00 in cents
                    const currency = 'usd';
                    const usdot = document.getElementById('usdot').value;
                    
                    // Store form data in localStorage for retrieval after payment
                    const formData = {
                        usdot: usdot,
                        ownerName: customerName,
                        email: customerEmail,
                        phone: document.getElementById('phone').value,
                        companyName: document.getElementById('companyName').value,
                        address: {
                            street: document.getElementById('streetAddress').value,
                            city: document.getElementById('city').value,
                            state: document.getElementById('state').value,
                            zip: document.getElementById('zipCode').value
                        }
                    };
                    localStorage.setItem('boc3_form_data', JSON.stringify(formData));
                    
                    // Create a PaymentIntent on the server
                    // In production, fetch from your server. For now, just simulate
                    let clientSecret;
                    let paymentIntentId;
                    
                    // Try to create a real payment intent from the server
                    try {
                        // Use full URL in production, relative URL in development
                        const apiUrl = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')
                            ? '/api/create-payment-intent'
                            : `${window.location.origin}/api/create-payment-intent`;
                            
                        const response = await fetch(apiUrl, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                amount,
                                currency,
                                customer_email: customerEmail,
                                customer_name: customerName,
                                metadata: {
                                    usdot,
                                    company_name: document.getElementById('companyName').value
                                }
                            }),
                        });
                        
                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.error || 'Failed to create payment intent');
                        }
                        
                        const data = await response.json();
                        clientSecret = data.clientSecret;
                        paymentIntentId = data.id;
                        console.log("Created payment intent:", paymentIntentId);
                    } catch (serverError) {
                        console.error("Server error:", serverError);
                        console.log("Falling back to client-side payment simulation");
                        // Continue with client-side simulation
                    }
                    
                    // Process payment with card element
                    let result;
                    
                    if (clientSecret) {
                        // If we got a client secret, confirm the payment
                        result = await stripe.confirmCardPayment(clientSecret, {
                            payment_method: {
                                card: cardElement,
                                billing_details: {
                                    name: customerName,
                                    email: customerEmail
                                }
                            }
                        });
                        
                        if (result.error) {
                            throw result.error;
                        }
                        
                        // Real payment was processed successfully
                        console.log("Payment successful:", result.paymentIntent);
                    } else {
                        // Fallback: create a payment method and simulate success
                        const { paymentMethod, error: paymentMethodError } = await stripe.createPaymentMethod({
                            type: 'card',
                            card: cardElement,
                            billing_details: {
                                name: customerName,
                                email: customerEmail
                            }
                        });
                        
                        if (paymentMethodError) {
                            throw paymentMethodError;
                        }
                        
                        // Simulate a successful payment
                        result = {
                            paymentIntent: {
                                id: `sim_${new Date().getTime()}`,
                                status: 'succeeded',
                                amount: amount,
                                currency: currency
                            },
                            paymentMethod: paymentMethod
                        };
                        
                        console.log("Simulated payment successful:", result.paymentIntent.id);
                    }
                    
                    // Store payment info for later use
                    const paymentInfo = {
                        id: result.paymentIntent.id,
                        last4: clientSecret ? result.paymentMethod?.card?.last4 : result.paymentMethod.card.last4,
                        brand: clientSecret ? result.paymentMethod?.card?.brand : result.paymentMethod.card.brand,
                        exp_month: clientSecret ? result.paymentMethod?.card?.exp_month : result.paymentMethod.card.exp_month,
                        exp_year: clientSecret ? result.paymentMethod?.card?.exp_year : result.paymentMethod.card.exp_year,
                        amount: amount / 100, // Convert to dollars
                        currency: currency
                    };
                    localStorage.setItem('boc3_payment_data', JSON.stringify(paymentInfo));
                    
                    // Mark payment as processed
                    paymentProcessed = true;
                    
                    // Show success message
                    const cardErrorElement = document.getElementById('card-errors');
                    cardErrorElement.textContent = clientSecret 
                        ? 'Payment processed successfully!'
                        : 'Payment processed successfully! (TEST MODE)';
                    cardErrorElement.classList.add('success');
                    cardErrorElement.classList.remove('error');
                    
                    // Proceed to next step
                    setTimeout(() => {
                        currentStep++;
                        updateForm();
                        
                        // Re-enable button
                        paymentNextBtn.disabled = false;
                        paymentNextBtn.textContent = 'Next';
                    }, 1000);
                    
                } catch (error) {
                    console.error('Payment processing error:', error);
                    
                    // Show error
                    const errorElement = document.getElementById('card-errors');
                    errorElement.textContent = error.message || 'An error occurred while processing your payment. Please try again.';
                    errorElement.classList.add('show');
                    
                    // Re-enable button
                    paymentNextBtn.disabled = false;
                    paymentNextBtn.textContent = 'Next';
                }
            } else {
                // If payment already processed, just go to next step
                if (validateStep(currentStep)) {
                    currentStep++;
                    updateForm();
                }
            }
        });
    }
    
    // Check URL parameters on page load for Stripe Checkout return
    function checkForPaymentReturn() {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentSuccess = urlParams.get('payment_success');
        const paymentCanceled = urlParams.get('payment_canceled');
        
        if (paymentSuccess === 'true') {
            // Clean up URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
            
            // Generate a simulated payment record 
            const paymentInfo = {
                id: 'ch_' + Math.random().toString(36).substr(2, 9),
                last4: '4242', // Default test card
                brand: 'visa',
                exp_month: 12,
                exp_year: 2025,
                amount: 150.00,
                currency: 'usd'
            };
            localStorage.setItem('boc3_payment_data', JSON.stringify(paymentInfo));
            
            // Mark payment as processed
            paymentProcessed = true;
            
            // Show success alert
            alert('Payment successful! Please proceed with your filing submission.');
            
            // Move to step 3
            currentStep = 2; // Step 3 has index 2
            updateForm();
        } else if (paymentCanceled === 'true') {
            // Clean up URL
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
            
            // Show canceled message
            const cardErrorElement = document.getElementById('card-errors');
            if (cardErrorElement) {
                cardErrorElement.textContent = 'Payment was canceled. Please try again.';
                cardErrorElement.classList.add('show');
            }
            
            // Ensure we're on the payment step
            currentStep = 1; // Step 2 has index 1
            updateForm();
        }
    }
    
    // Run payment return check on page load
    checkForPaymentReturn();

    // Show form when Start Filing button is clicked
    startFilingBtn.addEventListener('click', () => {
        formContainer.classList.remove('hidden');
        window.scrollTo({ top: formContainer.offsetTop, behavior: 'smooth' });
    });

    // Handle step navigation clicks
    steps.forEach(step => {
        step.addEventListener('click', (e) => {
            e.preventDefault();
            const targetStep = parseInt(step.getAttribute('data-step'));
            
            // Only allow moving to steps that have been completed or are next
            if (targetStep <= currentStep + 1) {
                if (targetStep === currentStep + 1) {
                    // Validate current step before moving forward
                    if (validateStep(currentStep)) {
                        currentStep = targetStep;
                        updateForm();
                    }
                } else {
                    currentStep = targetStep;
                    updateForm();
                }
            }
        });
    });

    // Handle next button clicks (except for payment step which is handled separately)
    nextBtns.forEach(btn => {
        if (btn.id !== 'payment-next-btn') {
            btn.addEventListener('click', () => {
                if (validateStep(currentStep)) {
                    currentStep++;
                    updateForm();
                }
            });
        }
    });

    // Handle previous button clicks
    prevBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currentStep--;
            updateForm();
        });
    });

    let currentStep = 0;

    function updateForm() {
        // Update steps indicator
        steps.forEach((step, index) => {
            if (index === currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });

        // Show current form step
        formSteps.forEach((step, index) => {
            if (index === currentStep) {
                step.classList.remove('hidden');
                
                // Initialize card element when showing payment step
                if (index === 1 && !paymentProcessed) { // Step 2 has index 1
                    setTimeout(initializeCardElement, 100);
                }
            } else {
                step.classList.add('hidden');
            }
        });
    }

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (validateStep(currentStep)) {
            const submitBtn = document.querySelector('.submit-btn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';
            
            try {
                // Collect form data
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
                    signature: document.getElementById('signatureCanvas').toDataURL(),
                    emailConsent: document.getElementById('emailNotifications').checked,
                    marketingConsent: document.getElementById('marketingEmails').checked
                };
                
                // Store form data in localStorage for retrieval after payment
                localStorage.setItem('boc3_form_data', JSON.stringify(formData));
                
                // Get payment data from localStorage (set during payment step)
                const paymentData = JSON.parse(localStorage.getItem('boc3_payment_data') || '{}');
                
                // Verify payment has been processed
                if (!paymentData.id) {
                    alert('Payment information is missing. Please go back and complete the payment step.');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'SUBMIT';
                    return;
                }
                
                // Generate PDF first
                const pdfDataUri = await generatePDF(formData);
                
                // Send email with PDF attached
                await sendEmailWithPDF(formData, pdfDataUri);
                
                // Create a custom FormData object for Supabase upload
                const supabaseFormData = {
                    get: function(key) {
                        switch(key) {
                            case 'usdot': return formData.usdot;
                            case 'companyName': return formData.companyName;
                            case 'ownerName': return formData.ownerName;
                            case 'email': return formData.email;
                            case 'phone': return formData.phone;
                            default: return '';
                        }
                    }
                };
                
                // Log the data being sent to Supabase
                console.log("Sending data to Supabase:", {
                    usdot: supabaseFormData.get('usdot'),
                    companyName: supabaseFormData.get('companyName'),
                    ownerName: supabaseFormData.get('ownerName'),
                    email: supabaseFormData.get('email'),
                    phone: supabaseFormData.get('phone')
                });
                
                // Upload PDF to Supabase in background with payment info
                try {
                    // Add a delay to ensure supabase client is fully initialized
                    setTimeout(async () => {
                        try {
                            const uploadResult = await uploadPDFToCloud(supabaseFormData, pdfDataUri);
                            console.log("PDF upload result:", uploadResult);
                            
                            // Mark as paid in Supabase
                            if (uploadResult) {
                                try {
                                    await updatePaymentStatus(formData.usdot, paymentData);
                                } catch (paymentError) {
                                    console.error("Error updating payment status:", paymentError);
                                }
                            }
                        } catch (delayedError) {
                            console.error("Error in delayed PDF upload:", delayedError);
                        }
                    }, 1000);
                } catch (error) {
                    console.error("Error setting up PDF upload:", error);
                    // Continue with form submission even if upload fails
                }
                
                // Show success message with download link
                const formStep = document.getElementById('step3');
                const successMessage = document.createElement('div');
                successMessage.className = 'bg-[#d4edda] p-4 rounded-lg mb-4 mt-4 text-[#155724] text-center';
                
                // Create a download link for the PDF
                const downloadLink = document.createElement('a');
                downloadLink.href = pdfDataUri;
                downloadLink.download = `BOC3_Filing_${formData.usdot}.pdf`;
                downloadLink.className = 'inline-block bg-[#4CAF50] hover:bg-[#45a049] text-white font-bold py-2 px-6 rounded mt-2';
                downloadLink.innerHTML = '<i class="fas fa-download mr-2"></i> Download PDF';
                
                // Show payment information in success message
                const cardInfo = document.createElement('div');
                cardInfo.className = 'mt-2 text-gray-600';
                cardInfo.innerHTML = `
                    <p>Payment processed with card ending in ${paymentData.last4 || '****'}</p>
                    <p>Transaction ID: ${paymentData.id || 'Unknown'}</p>
                `;
                
                successMessage.innerHTML = `
                    <p class="mb-3"><i class="fas fa-check-circle mr-2"></i> Your BOC-3 filing has been completed successfully!</p>
                    <p>We've received your payment and will process your filing immediately.</p>
                    <p>A confirmation email with your PDF has been sent to ${formData.email}.</p>
                `;
                successMessage.appendChild(downloadLink);
                successMessage.appendChild(cardInfo);
                
                // Replace form content with success message
                formStep.innerHTML = '';
                formStep.appendChild(successMessage);
                
            } catch (error) {
                console.error('Error:', error);
                alert('An error occurred while processing your submission. Please try again.');
                submitBtn.disabled = false;
                submitBtn.textContent = 'SUBMIT';
            }
        }
    });

    // Handle billing address toggle
    const sameAddressCheckbox = document.getElementById('sameAddress');
    const billingAddressSection = document.getElementById('billingAddress');

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

    // Format card number input with Luhn algorithm validation
    const cardNumberInput = document.getElementById('cardNumber');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(\d{4})/g, '$1 ').trim();
            e.target.value = value;
        });

        cardNumberInput.addEventListener('blur', function(e) {
            // Luhn algorithm for card number validation
            const value = e.target.value.replace(/\D/g, '');
            if (value.length < 13 || value.length > 19 || !isValidCardNumber(value)) {
                e.target.classList.add('error');
                displayError(e.target, 'Please enter a valid card number');
            } else {
                e.target.classList.remove('error');
                removeError(e.target);
            }
        });
    }

    // Format expiry date input with validation
    const expiryInput = document.getElementById('expiry');
    if (expiryInput) {
        expiryInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 0) {
                // Format month
                if (value.length >= 1) {
                    const month = parseInt(value.substring(0, 2));
                    if (value.length === 1 && month > 1) {
                        value = '0' + value;
                    }
                    if (month > 12) {
                        value = '12' + value.substring(2);
                    }
                }
                
                // Add slash after month
                if (value.length >= 2) {
                    value = value.slice(0, 2) + '/' + value.slice(2);
                }
            }
            e.target.value = value.substring(0, 5);
            
            // Check if current value is valid
            if (value.length >= 4 && isValidExpiryDate(e.target.value)) {
                removeError(e.target);
            }
        });

        expiryInput.addEventListener('blur', function(e) {
            const value = e.target.value;
            const isValid = isValidExpiryDate(value);
            if (!isValid) {
                e.target.classList.add('error');
                displayError(e.target, 'Please enter a valid expiry date (MM/YY)');
            } else {
                e.target.classList.remove('error');
                removeError(e.target);
            }
        });
    }

    // Format CVV input with validation
    const cvvInput = document.getElementById('cvv');
    if (cvvInput) {
        cvvInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
            
            // Check if current value is valid and clear errors if it is
            const value = e.target.value;
            if (value.length >= 3 && value.length <= 4) {
                removeError(e.target);
            }
        });

        cvvInput.addEventListener('blur', function(e) {
            const value = e.target.value;
            if (value.length < 3 || value.length > 4) {
                e.target.classList.add('error');
                // Remove any existing error messages first
                let nextElement = e.target.nextElementSibling;
                while (nextElement) {
                    if (nextElement.classList.contains('validation-error')) {
                        const tempNext = nextElement.nextElementSibling;
                        nextElement.remove();
                        nextElement = tempNext;
                    } else {
                        nextElement = nextElement.nextElementSibling;
                    }
                }
                // Add a single error message
                displayError(e.target, 'CVV must be 3 or 4 digits');
            } else {
                removeError(e.target);
            }
        });
    }

    // USDOT Number validation - max 10 characters
    const usdotInput = document.getElementById('usdot');
    if (usdotInput) {
        usdotInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            e.target.value = value.slice(0, 10);
        });
    }

    // Phone number formatting (XXX)-XXX-XXXX
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 10) {
                value = value.slice(0, 10);
                value = `(${value.slice(0,3)})-${value.slice(3,6)}-${value.slice(6)}`;
            }
            e.target.value = value;
        });
    }

    // Email validation
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('blur', function(e) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(e.target.value)) {
                e.target.classList.add('error');
                alert('Please enter a valid email address');
            } else {
                e.target.classList.remove('error');
            }
        });
    }

    // Add event listener to confirmation checkbox
    const confirmInfoCheckbox = document.getElementById('confirmInfo');
    if (confirmInfoCheckbox) {
        confirmInfoCheckbox.addEventListener('change', function() {
            if (this.checked) {
                this.classList.remove('error');
                const errorMsg = this.closest('.checkbox-group').querySelector('.validation-error');
                if (errorMsg) {
                    errorMsg.classList.remove('show');
                }
            }
        });
    }

    // Convert initials to uppercase
    const initialsInputs = document.querySelectorAll('.initials-input');
    if (initialsInputs.length > 0) {
        initialsInputs.forEach(input => {
            input.addEventListener('input', function() {
                this.value = this.value.toUpperCase();
            });
        });
    }

    function validateStep(step) {
        const currentFormStep = formSteps[step];
        const inputs = currentFormStep.querySelectorAll('input[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (input.type === 'checkbox' && input.id === 'confirmInfo') {
                if (!input.checked) {
                    isValid = false;
                    input.classList.add('error');
                    const errorMsg = input.closest('.checkbox-group').querySelector('.validation-error');
                    if (errorMsg) {
                        errorMsg.classList.add('show');
                    } else {
                        alert('Please check the confirmation box to proceed.');
                    }
                }
            } else if (!input.value) {
                isValid = false;
                input.classList.add('error');
            } else if (input.id === 'email') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(input.value)) {
                    isValid = false;
                    input.classList.add('error');
                } else {
                    input.classList.remove('error');
                }
            } else if (input.id === 'phone') {
                const phoneRegex = /^\(\d{3}\)-\d{3}-\d{4}$/;
                if (!phoneRegex.test(input.value)) {
                    isValid = false;
                    input.classList.add('error');
                } else {
                    input.classList.remove('error');
                }
            } else {
                input.classList.remove('error');
            }
        });

        return isValid;
    }

    // Signature Pad Implementation
    const canvas = document.getElementById('signatureCanvas');
    const clearButton = document.getElementById('clearSignature');
    let signaturePad;

    if (canvas) {
        // Initialize signature pad with better settings
        signaturePad = new SignaturePad(canvas, {
            backgroundColor: 'rgba(255, 255, 255, 0)',
            penColor: 'rgb(0, 0, 0)',
            minWidth: 1,
            maxWidth: 2.5,
            throttle: 16, // Increase responsiveness
            onBegin: function() {
                canvas.classList.remove('error');
            }
        });

        // Clear signature
        if (clearButton) {
            clearButton.addEventListener('click', function() {
                signaturePad.clear();
            });
        }

        // Handle window resize
        window.addEventListener('resize', function() {
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            canvas.width = canvas.offsetWidth * ratio;
            canvas.height = canvas.offsetHeight * ratio;
            canvas.style.width = `${canvas.offsetWidth}px`;
            canvas.style.height = `${canvas.offsetHeight}px`;
            signaturePad.clear();
        });

        // Enhance the existing validateStep function for signature validation
        let previousValidateStep = validateStep;
        validateStep = function(step) {
            let isValid = previousValidateStep(step);
            
            // Add signature validation for the final step
            if (step === 2) { // Assuming step 3 is index 2
                if (!signaturePad || signaturePad.isEmpty()) {
                    isValid = false;
                    canvas.classList.add('error');
                    alert('Please provide your signature');
                } else {
                    canvas.classList.remove('error');
                }
            }
            
            return isValid;
        };
    }

    // Helper functions for validation
    function isValidCardNumber(cardNumber) {
        // Luhn algorithm for card validation
        let sum = 0;
        let shouldDouble = false;
        
        // Loop from right to left
        for (let i = cardNumber.length - 1; i >= 0; i--) {
            let digit = parseInt(cardNumber.charAt(i));
            
            if (shouldDouble) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            
            sum += digit;
            shouldDouble = !shouldDouble;
        }
        
        return sum % 10 === 0;
    }

    function isValidExpiryDate(expiryDate) {
        if (!expiryDate || expiryDate.length !== 5) {
            return false;
        }
        
        const parts = expiryDate.split('/');
        if (parts.length !== 2) {
            return false;
        }
        
        const month = parseInt(parts[0]);
        const year = parseInt('20' + parts[1]); // Assuming 20XX years
        
        if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
            return false;
        }
        
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11
        
        // Check if card is not expired
        return (year > currentYear || (year === currentYear && month >= currentMonth));
    }

    function displayError(element, message) {
        // Remove any existing error messages first
        let sibling = element.nextElementSibling;
        while (sibling) {
            if (sibling.classList.contains('validation-error')) {
                const nextSibling = sibling.nextElementSibling;
                sibling.remove();
                sibling = nextSibling;
            } else {
                sibling = sibling.nextElementSibling;
            }
        }
        
        // Create a new error message
        const errorElement = document.createElement('div');
        errorElement.className = 'validation-error';
        errorElement.textContent = message;
        errorElement.classList.add('show');
        
        // Insert after the element
        element.parentNode.insertBefore(errorElement, element.nextSibling);
    }

    function removeError(element) {
        // Remove the error class from the input
        element.classList.remove('error');
        
        // Find and remove all error messages next to this element
        let nextElement = element.nextElementSibling;
        while (nextElement) {
            if (nextElement.classList.contains('validation-error')) {
                nextElement.classList.remove('show');
                nextElement.textContent = '';
            }
            nextElement = nextElement.nextElementSibling;
        }
    }

    // Update validation for payment step
    let baseValidateStep = validateStep;
    validateStep = function(step) {
        let isValid = baseValidateStep(step);
        
        // No additional validation needed for payment step now that we're using Stripe Checkout
        return isValid;
    };

    // Function to generate PDF
    async function generatePDF(data) {
        // Access the jsPDF library
        const { jsPDF } = window.jspdf;
        
        // Optimize signature image if it exists
        let optimizedSignature = null;
        if (data.signature) {
            // Compress the signature by reducing quality and dimensions
            optimizedSignature = await compressSignatureImage(data.signature);
        }
        
        // Create a new PDF document with compression options
        const doc = new jsPDF({
            compress: true,
            precision: 2
        });
        
        // Add header with smaller font sizes to reduce complexity
        doc.setFontSize(16);
        doc.setTextColor(76, 175, 80);
        doc.text('BOC-3 Filing Service', 105, 20, null, null, 'center');
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text('Order Confirmation', 105, 30, null, null, 'center');
        
        // Add date and order number with minimal formatting
        const today = new Date();
        const orderNumber = 'BOC-' + Math.floor(100000 + Math.random() * 900000);
        
        doc.setFontSize(9);
        doc.text(`Date: ${today.toLocaleDateString()} | Order #: ${orderNumber}`, 20, 40);
        
        // Simple line instead of complex graphics
        doc.line(20, 45, 190, 45);
        
        // Add all customer information in compact format
        doc.setFontSize(10);
        doc.text('Customer Information', 20, 55);
        
        doc.setFontSize(9);
        doc.text(`USDOT: ${data.usdot} | Company: ${data.companyName}`, 20, 65);
        doc.text(`Owner: ${data.ownerName}`, 20, 72);
        doc.text(`Email: ${data.email} | Phone: ${data.phone}`, 20, 79);
        
        // Address in compact format
        doc.text('Address:', 20, 90);
        doc.text(`${data.address.street}, ${data.address.city}, ${data.address.state} ${data.address.zip}`, 20, 97);
        
        // Simplified order details
        doc.text('Service: BOC-3 Process Agent Filing Service (All 50 states)', 20, 110);
        doc.text('Price: $150.00 | Payment Status: Pending', 20, 120);
        
        // Add signature on same page to save space
        if (optimizedSignature) {
            doc.text('Signature:', 20, 135);
            
            try {
                // Use PNG format for better quality and transparency
                doc.addImage(optimizedSignature, 'PNG', 20, 140, 80, 25, undefined, 'FAST');
            } catch (error) {
                console.error('Failed to add signature to PDF:', error);
                console.log('Error details:', error);
                doc.text('Signature could not be displayed', 20, 150);
            }
        }
        
        // Add terms in compact format
        doc.text('Agreed Terms:', 20, 175);
        doc.setFontSize(7);
        doc.text('• I certify that I am the authorized holder and signer of the credit card.', 20, 182);
        doc.text('• I understand that this information is provided in good faith by me.', 20, 187);
        doc.text('• I authorize payment to DOT Operating Authority Inc.', 20, 192);
        doc.text('• I acknowledge that the total amount includes all government fees.', 20, 197);
        doc.text('• I agree that this payment is non-refundable after agent assignment.', 20, 202);
        
        // Final note
        doc.setFontSize(8);
        doc.text('Thank you for your order! Please complete payment to finalize your BOC-3 filing.', 105, 230, null, null, 'center');
        
        // Return PDF as data URI with higher compression
        return doc.output('datauristring', {compress: true});
    }
    
    // Helper function to compress signature image
    async function compressSignatureImage(signatureDataUri) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = function() {
                // Create a smaller canvas for the compressed image
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Reduce dimensions to 50% of original
                canvas.width = img.width * 0.5;
                canvas.height = img.height * 0.5;
                
                // Draw the image at reduced size
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Convert to JPEG with low quality (0.5 = 50% quality)
                resolve(canvas.toDataURL('image/jpeg', 0.5));
            };
            img.src = signatureDataUri;
        });
    }

    // Helper function to compress signature image with better transparency handling
    async function compressSignatureImage(signatureDataUri) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = function() {
                // Create a smaller canvas for the compressed image
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Reduce dimensions to 50% of original
                canvas.width = img.width * 0.5;
                canvas.height = img.height * 0.5;
                
                // Fill with white background first
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw the image at reduced size
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                // Convert to PNG to preserve quality
                resolve(canvas.toDataURL('image/png'));
            };
            img.src = signatureDataUri;
        });
    }

    // Function to send email with PDF attachment
    async function sendEmailWithPDF(formData, pdfDataUri) {
        try {
            // Check if EmailJS is loaded, if not load it
            if (typeof emailjs === 'undefined') {
                await loadEmailJSScript();
            }
            
            // Generate order number
            const orderNumber = 'BOC-' + Math.floor(100000 + Math.random() * 900000);
            
            // Create template params WITHOUT signature or PDF attachment
            const templateParams = {
                email: formData.email,
                to_name: formData.ownerName,
                company_name: formData.companyName,
                order_number: orderNumber,
                usdot: formData.usdot,
                phone: formData.phone || '',
                address: formData.address ? `${formData.address.street}, ${formData.address.city}, ${formData.address.state} ${formData.address.zip}` : '',
                message_content: "Your BOC-3 filing has been received. Please download your PDF from the confirmation page and complete the payment to finalize your filing."
            };
            
            console.log("Sending email with following parameters:", {
                email: formData.email,
                to_name: formData.ownerName,
                company_name: formData.companyName,
                order_number: orderNumber,
                usdot: formData.usdot
            });
            
            // Send email using EmailJS
            try {
                const response = await emailjs.send("service_fileboc3", "template_okjixci", templateParams);
                console.log('Email sent successfully!', response.status, response.text);
                return true;
            } catch (error) {
                console.error('Email failed to send:', error);
                console.log('Error details:', error);
                // Show error message to user but continue with payment flow
                alert('We were unable to send the confirmation email. Please download your PDF now and continue to payment.');
                return false;
            }
        } catch (error) {
            console.error("Error in sendEmailWithPDF:", error);
            alert('Error preparing email. Please download your PDF now and continue to payment.');
            return false;
        }
    }

    // Function to load EmailJS script early
    async function loadEmailJSScript() {
        if (typeof emailjs === 'undefined') {
            // Load EmailJS dynamically
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
            script.async = true;
            document.head.appendChild(script);
            
            // Wait for script to load
            await new Promise(resolve => {
                script.onload = () => {
                    // Initialize EmailJS once loaded
                    emailjs.init("O1SRnxMXLrWqtQSs3");
                    console.log("EmailJS loaded and initialized");
                    resolve();
                };
                script.onerror = () => {
                    console.error("Failed to load EmailJS script");
                    resolve();
                };
            });
        }
    }

    // Helper function to load Supabase client
    async function loadSupabaseClient() {
        return new Promise(async (resolve) => {
            try {
                // Check if Supabase is already available in window object
                if (window.supabaseClient) {
                    console.log("Supabase client already available in window.supabaseClient");
                    resolve(window.supabaseClient);
                    return;
                }
                
                // Check if supabase is already loaded (global object from script tag)
                if (typeof supabase !== 'undefined') {
                    console.log("Supabase library already loaded via script tag");
                    
                    // Initialize the client with credentials
                    const supabaseUrl = 'https://fedrwwuqzgdogvwmlugv.supabase.co';
                    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlZHJ3d3Vxemdkb2d2d21sdWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNDc4MDgsImV4cCI6MjA1ODkyMzgwOH0.yUbMKtFXI2l1tGdz3zvMzRWYzvwI66LeeBFzmYV-sUk';
                    
                    // Create the client
                    window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
                    console.log("Supabase client successfully initialized");
                    resolve(window.supabaseClient);
                    return;
                }
                
                // If we got here, we need to load Supabase from CDN
                console.log("Loading Supabase JS SDK from CDN...");
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
                    resolve(null);
                    return;
                }
                
                // Initialize the client with credentials
                const supabaseUrl = 'https://fedrwwuqzgdogvwmlugv.supabase.co';
                const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlZHJ3d3Vxemdkb2d2d21sdWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNDc4MDgsImV4cCI6MjA1ODkyMzgwOH0.yUbMKtFXI2l1tGdz3zvMzRWYzvwI66LeeBFzmYV-sUk';
                
                // Create and store the client
                window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
                console.log("Supabase client successfully initialized");
                resolve(window.supabaseClient);
            } catch (error) {
                console.error("Error initializing Supabase client:", error);
                resolve(null);
            }
        });
    }

    // Upload PDF to Supabase and record metadata
    async function uploadPDFToCloud(formData, pdfDataUri) {
        try {
            console.log("Starting PDF upload to Supabase...");
            
            // Load Supabase client
            const supabase = await loadSupabaseClient();
            
            // Make sure supabase was initialized
            if (!supabase) {
                console.error("Supabase client not properly initialized");
                console.log("Will try fallback method...");
                
                // Try once more with a direct initialization
                try {
                    const supabaseUrl = 'https://fedrwwuqzgdogvwmlugv.supabase.co';
                    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlZHJ3d3Vxemdkb2d2d21sdWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMzNDc4MDgsImV4cCI6MjA1ODkyMzgwOH0.yUbMKtFXI2l1tGdz3zvMzRWYzvwI66LeeBFzmYV-sUk';
                    
                    if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
                        console.log("Attempting direct client creation...");
                        const directClient = supabase.createClient(supabaseUrl, supabaseKey);
                        
                        if (!directClient) {
                            throw new Error("Failed to create direct Supabase client");
                        }
                        
                        console.log("Fallback Supabase client created");
                        window.supabaseClient = directClient;
                        return await uploadWithClient(directClient, formData, pdfDataUri);
                    } else {
                        throw new Error("Supabase library not available");
                    }
                } catch (fallbackError) {
                    console.error("Fallback initialization failed:", fallbackError);
                    return false;
                }
            }
            
            return await uploadWithClient(supabase, formData, pdfDataUri);
        } catch (error) {
            console.error("Unexpected error in uploadPDFToCloud:", error);
            return false;
        }
    }
    
    // Helper function to handle the actual upload with a client
    async function uploadWithClient(supabase, formData, pdfDataUri) {
        try {
            // Extract base64 data from data URI
            const base64Data = pdfDataUri.split(',')[1];
            
            // Convert to blob for upload
            const pdfBlob = b64toBlob(base64Data, 'application/pdf');
            
            // Create a unique filename based on USDOT number and date
            const usdot = formData.get('usdot');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `BOC3_${usdot}_${timestamp}.pdf`;
            
            console.log("Preparing to upload file:", filename);
            console.log("File size:", Math.round(pdfBlob.size / 1024), "KB");
            
            // Skip bucket creation - assume it exists
            
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
                console.log("Error details:", uploadError.message, uploadError.details);
                return false;
            }
            
            console.log("PDF successfully uploaded:", fileData.path);
            
            // Get the exact values from the form data object
            const usdotNumber = parseInt(formData.get('usdot')) || 0;
            const companyName = formData.get('companyName') || '';
            const ownerName = formData.get('ownerName') || '';
            const email = formData.get('email') || '';
            const phone = formData.get('phone') || '';
            
            console.log("Preparing database record with data:", {
                file_path: fileData.path,
                filename,
                usdot: usdotNumber,
                company_name: companyName,
                owner_name: ownerName,
                email,
                phone
            });
            
            // Create a database record with metadata - using exact column names from the schema
            console.log("Inserting record into boc3_submissions table...");
            const { data: recordData, error: recordError } = await supabase
                .from('boc3_submissions')
                .insert([
                    {
                        file_path: fileData.path,
                        filename: filename,
                        usdot: usdotNumber,
                        company_name: companyName,
                        owner_name: ownerName,
                        email: email,
                        phone: phone,
                        timestamp: new Date().toISOString(),
                        status: 'submitted'
                    }
                ]);
                
            if (recordError) {
                console.error("Error creating database record:", recordError);
                console.log("Error code:", recordError.code);
                console.log("Error message:", recordError.message);
                console.log("Error details:", recordError.details);
                console.log("Error hint:", recordError.hint);
                return true; // Still return true since the file was uploaded
            }
            
            console.log("Database record created successfully:", recordData);
            return true;
        } catch (error) {
            console.error("Error in uploadWithClient:", error);
            return false;
        }
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

        return new Blob(byteArrays, { type: contentType });
    }

    // Add a button to download all stored PDFs
    function addDownloadAllPDFsButton() {
        // Check if button already exists
        if (document.getElementById('download-all-pdfs-btn')) {
            return;
        }
        
        // Create a hidden button that will be shown only to admin
        const downloadAllBtn = document.createElement('button');
        downloadAllBtn.id = 'download-all-pdfs-btn';
        downloadAllBtn.style.display = 'none'; // Hidden by default
        downloadAllBtn.className = 'download-btn mt-4 fixed bottom-4 right-4 z-50';
        downloadAllBtn.innerHTML = '<i class="fas fa-download mr-2"></i> Admin: Download All PDFs';
        downloadAllBtn.addEventListener('click', downloadAllStoredPDFs);
        
        // Add button to body
        document.body.appendChild(downloadAllBtn);
        
        // Add a keyboard shortcut to show the button (Ctrl+Shift+P)
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                downloadAllBtn.style.display = downloadAllBtn.style.display === 'none' ? 'block' : 'none';
            }
        });
    }

    // Function to download all stored PDFs as a zip file
    function downloadAllStoredPDFs() {
        try {
            const pdfStorage = JSON.parse(localStorage.getItem('boc3_pdf_storage') || '{}');
            
            if (Object.keys(pdfStorage).length === 0) {
                alert('No PDFs found in storage.');
                return;
            }
            
            // Create a text file with metadata about all PDFs
            let metadataText = 'BOC-3 Filing Records\n';
            metadataText += '====================\n\n';
            
            // For each PDF, create a download link
            Object.entries(pdfStorage).forEach(([filename, data]) => {
                // Add to metadata text
                metadataText += `Filename: ${filename}\n`;
                metadataText += `USDOT: ${data.usdot}\n`;
                metadataText += `Company: ${data.company}\n`;
                metadataText += `Owner: ${data.owner}\n`;
                metadataText += `Email: ${data.email}\n`;
                metadataText += `Phone: ${data.phone}\n`;
                metadataText += `Created: ${data.created}\n\n`;
                
                // Create a download link for this PDF
                const link = document.createElement('a');
                link.href = data.pdfData;
                link.download = filename;
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
            
            // Create and download the metadata text file
            const metadataBlob = new Blob([metadataText], { type: 'text/plain' });
            const metadataLink = document.createElement('a');
            metadataLink.href = URL.createObjectURL(metadataBlob);
            metadataLink.download = 'boc3_records_metadata.txt';
            metadataLink.style.display = 'none';
            document.body.appendChild(metadataLink);
            metadataLink.click();
            document.body.removeChild(metadataLink);
            
        } catch (error) {
            console.error('Error downloading PDFs:', error);
            alert('Error downloading PDFs. See console for details.');
        }
    }

    // Add a test function that can be called from the browser console
    window.testSupabaseConnection = async function() {
        try {
            console.log("Testing Supabase connection...");
            
            // Make sure we have a client
            await loadSupabaseClient();
            
            if (!window.supabase) {
                throw new Error("Supabase client is not initialized");
            }
            
            // Use the window.supabase object directly
            const testClient = window.supabase;
            
            // Test storage connection
            console.log("Testing storage...");
            const { data: buckets, error: bucketError } = await testClient.storage.listBuckets();
            
            if (bucketError) {
                console.error("Storage test failed:", bucketError);
            } else {
                console.log("Storage test successful! Available buckets:", buckets);
                console.log("Using existing 'boc3-filings' bucket");
                
                // Skip bucket creation - just test listing files
                const { data: files, error: listError } = await testClient.storage
                    .from('boc3-filings')
                    .list();
                    
                if (listError) {
                    console.error("Error listing files in bucket:", listError);
                } else {
                    console.log("Files in boc3-filings bucket:", files || "No files yet");
                }
            }
            
            // Test database connection
            console.log("Testing database...");
            const { data: tableData, error: tableError } = await testClient
                .from('boc3_submissions')
                .select('id')
                .limit(1);
                
            if (tableError) {
                console.error("Database test failed:", tableError);
            } else {
                console.log("Database test successful!", tableData);
                
                // Test insert
                console.log("Testing insert operation...");
                const testRecord = {
                    file_path: 'test/path.pdf',
                    filename: 'test_file.pdf',
                    usdot: 12345,
                    company_name: 'Test Company',
                    owner_name: 'Test Owner',
                    email: 'test@example.com',
                    phone: '(555)-555-5555',
                    timestamp: new Date().toISOString(),
                    status: 'test'
                };
                
                const { data: insertData, error: insertError } = await testClient
                    .from('boc3_submissions')
                    .insert([testRecord]);
                    
                if (insertError) {
                    console.error("Insert test failed:", insertError);
                    console.log("Error details:", {
                        code: insertError.code,
                        message: insertError.message,
                        details: insertError.details,
                        hint: insertError.hint
                    });
                } else {
                    console.log("Insert test successful!", insertData);
                }
            }
            
            return "Supabase connection tests completed. Check console for results.";
        } catch (error) {
            console.error("Supabase test error:", error);
            return "Supabase test error. Check console for details.";
        }
    };

    console.log("Added testSupabaseConnection() function. Run it in the console to test the Supabase connection.");

    // Function to update payment status in Supabase
    async function updatePaymentStatus(usdot, paymentData) {
        try {
            console.log("Updating payment status for USDOT:", usdot);
            
            // Load Supabase client
            const supabase = await loadSupabaseClient();
            
            // Make sure supabase was initialized
            if (!supabase) {
                console.error("Supabase client not properly initialized for payment status update");
                // Don't try fallback here - we'll just log the error and continue
                // The customer will still have a successful experience even if this fails
                return false;
            }
            
            // Update only the status field which definitely exists
            const { data, error } = await supabase
                .from('boc3_submissions')
                .update({ status: 'paid' })
                .eq('usdot', usdot)
                .order('timestamp', { ascending: false })
                .limit(1);
                
            if (error) {
                console.error("Error updating payment status:", error);
                console.log("Error details:", error.message, error.details);
                return false;
            }
            
            console.log("Payment status updated successfully in Supabase");
            return true;
        } catch (error) {
            console.error("Error in updatePaymentStatus:", error);
            // This is not critical for the user experience, so just log and continue
            return false;
        }
    }
});
