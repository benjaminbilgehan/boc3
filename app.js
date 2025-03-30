// Main application script
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, initializing app from app.js...');
    
    // Get main UI elements
    const startFilingBtn = document.querySelector('.start-filing-btn');
    const formContainer = document.querySelector('.form-container');
    
    console.log("Start filing button:", startFilingBtn);
    console.log("Form container:", formContainer);
    
    // Add click event listener to the "Start Filing" button
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
});
