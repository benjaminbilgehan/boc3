/**
 * BOC-3 Filing Service
 * Version tracking file
 * Update this file when making changes to the codebase
 */

const APP_VERSION = {
    version: '1.1.0',
    releaseDate: '2025-03-30',
    buildTime: Date.now(),
    environment: window.location.hostname.includes('localhost') ? 'development' : 'production',
    isProduction: !window.location.hostname.includes('localhost'),
    features: [
        'Carrier information form',
        'Stripe payment integration',
        'PDF generation',
        'Email notifications',
        'Supabase database integration',
        'Form field locking after payment',
        'Multi-user support with Start New Application feature',
        'Production deployment with Vercel',
        'Custom domain support'
    ],
    lastUpdated: 'March 30, 2025'
};

// Make version available globally
window.APP_VERSION = APP_VERSION;

// Log version info on page load for debugging
console.log('BOC-3 Filing Service Version:', APP_VERSION.version);
console.log('Build date:', new Date(APP_VERSION.buildTime).toLocaleString());
console.log('Environment:', APP_VERSION.environment);

// Add footer version info if available
document.addEventListener('DOMContentLoaded', function() {
    const footer = document.querySelector('footer');
    if (footer) {
        footer.setAttribute('data-version', `v${APP_VERSION.version}`);
        footer.setAttribute('data-environment', APP_VERSION.environment);
    }
}); 