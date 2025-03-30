# BOC-3 Filing Service

A web application for processing BOC-3 filings with Stripe payment integration and Supabase backend.

## 🚀 Quick Setup

1. Clone this repository
2. Install dependencies: `npm install`
3. Create `.env` file based on `.env.example`
4. Start development server: `npm run dev`

## 🔐 Environment Setup

Before deploying, you need to set up the following:

### Stripe Configuration

1. Create a [Stripe account](https://dashboard.stripe.com/register)
2. Get your API keys from the [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
3. Create a product and price for the BOC-3 filing service:
   - Go to [Products](https://dashboard.stripe.com/products)
   - Create a new product named "BOC-3 Process Agent Filing Service"
   - Set the price to $150.00 USD
   - Copy the Price ID (starts with `price_`)
   - Use this ID in the `script.js` file where indicated

### Supabase Configuration

1. Create a [Supabase account](https://supabase.com/)
2. Create a new project
3. Set up the following tables:
   ```sql
   -- Create boc3_submissions table
   CREATE TABLE boc3_submissions (
     id SERIAL PRIMARY KEY,
     usdot INTEGER NOT NULL,
     company_name TEXT NOT NULL,
     owner_name TEXT NOT NULL,
     email TEXT NOT NULL,
     phone TEXT,
     file_path TEXT,
     filename TEXT,
     timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     status TEXT DEFAULT 'submitted'
   );
   
   -- Create storage bucket
   INSERT INTO storage.buckets (id, name)
   VALUES ('boc3-filings', 'BOC-3 Filings');
   ```
4. Set the storage bucket permissions to allow uploads
5. Get your Supabase URL and anon key from Settings > API
6. Add these values to your environment variables

## 🚢 Deployment to Vercel

1. Push your code to GitHub
2. Connect your repository to [Vercel](https://vercel.com)
3. Add the following environment variables in Vercel:
   - `STRIPE_SECRET_KEY`: Your Stripe secret key
   - `SUPABASE_URL`: Your Supabase URL
   - `SUPABASE_ANON_KEY`: Your Supabase anon key
4. Deploy your application

## 💳 Testing Payments

Use these test cards to verify your payment integration:

- **Success**: 4242 4242 4242 4242
- **Insufficient Funds**: 4000 0000 0000 9995
- **Requires Authentication**: 4000 0000 0000 3220

Use any future expiration date, any 3-digit CVC, and any billing postal code.

## 🧰 Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Payment Processing**: Stripe Elements and PaymentIntents API
- **Backend Storage**: Supabase
- **Serverless Functions**: Vercel Serverless Functions
- **PDF Generation**: jsPDF
- **Signature Capture**: SignaturePad

## 🔍 Important Files

- `index.html`: Main HTML file with form structure
- `style.css`: Styling for the application
- `script.js`: Main JavaScript with form handling and payment processing
- `api/create-payment-intent.js`: Serverless function for Stripe PaymentIntents
- `vercel.json`: Vercel deployment configuration

## 🤝 Getting Help

If you need help with the application, please:

1. Check the Stripe documentation for [Elements](https://stripe.com/docs/js/elements_object) and [PaymentIntents](https://stripe.com/docs/api/payment_intents)
2. Review the Supabase docs for [storage](https://supabase.com/docs/guides/storage) and [database](https://supabase.com/docs/guides/database)
3. Consult the [Vercel documentation](https://vercel.com/docs) for deployment issues

# BOC-3 Filing Service - Integration Guide

This repository contains a complete BOC-3 filing service website that uses Stripe Checkout for payments and provides PDF generation and email functionality. Since this implementation doesn't require a backend server, it's suitable for hosting on platforms like Vercel, Netlify, or GitHub Pages.

## Stripe Integration Setup

For Stripe integration to work properly, you need to set up a few things:

1. **Create a Stripe Account**: Go to [stripe.com](https://stripe.com) and sign up

2. **Get Your Stripe Public Key**:
   - Go to your Stripe Dashboard
   - Navigate to Developers > API keys
   - Copy your "Publishable key"
   - Update the `stripePublicKey` variable in `script.js` with your key

3. **Create a Stripe Checkout Product**:
   - In your Stripe Dashboard, go to Products > + Add Product
   - Create a product for your BOC-3 filing service
   - Set the price to $150.00 (or your desired amount)
   - Save the product

4. **Create a Checkout Session Link**:
   - Go to Payments > Checkout settings
   - Create a new Checkout Session
   - Select your BOC-3 filing product
   - Set the success URL to `https://your-website.com/success.html`
   - Set the cancel URL to `https://your-website.com/index.html`
   - Save the session
   - Copy the generated session URL or ID

5. **Update Your Code**:
   - Find the line in `script.js` that contains:
     ```javascript
     window.location.href = `https://checkout.stripe.com/pay/cs_test_YOURKEYHERE?prefilled_email=${encodeURIComponent(formData.email)}`;
     ```
   - Replace `cs_test_YOURKEYHERE` with your actual Checkout Session ID

## PDF Generation Setup

PDF generation is handled on the client side using jsPDF library. No additional setup is required, but you may want to customize the PDF template in the `generatePDF` function inside `success.html`.

## Email Integration Setup

To enable sending emails with PDF attachments, follow these steps:

1. **Create an EmailJS Account**:
   - Go to [emailjs.com](https://www.emailjs.com/) and sign up for an account
   - Create a new email service by connecting your email provider (Gmail, Outlook, etc.)
   - Create an email template with the following template parameters:
     - `to_email` - recipient's email
     - `to_name` - recipient's name
     - `company_name` - company name
     - `order_number` - generated order number
     - `usdot` - customer's USDOT number
     - `pdf_attachment` - the PDF data URI

2. **Update Your Code**:
   - Find the line in `success.html` that contains:
     ```javascript
     emailjs.init("YOUR_EMAILJS_PUBLIC_KEY");
     ```
   - Replace `YOUR_EMAILJS_PUBLIC_KEY` with your EmailJS public key

   - Find the lines that contain:
     ```javascript
     emailjs.send("YOUR_SERVICE_ID", "YOUR_TEMPLATE_ID", templateParams)
     ```
   - Replace `YOUR_SERVICE_ID` with your EmailJS service ID
   - Replace `YOUR_TEMPLATE_ID` with your EmailJS template ID

## Additional Considerations

### For Production

For a production environment, you might want to:

1. Use [Zapier](https://zapier.com), [Make.com](https://make.com), or [FormSubmit.co](https://formsubmit.co) as additional options to handle form data.

2. Consider upgrading to a more robust solution when your business grows, possibly using serverless functions on Vercel or Netlify to create dynamic Checkout sessions.

### Security Notes

1. This implementation stores form data in localStorage. This is sufficient for basic needs but not for sensitive information in a production environment.

2. The signature data is stored as a base64 image. For legal purposes, consider using a more secure method in a production environment.

3. EmailJS free tier has limitations on the number of emails you can send. Consider upgrading for production use.

## Testing

When testing payments, use Stripe's test card numbers:
- Card number: 4242 4242 4242 4242
- Expiration date: Any future date
- CVC: Any 3 digits
- ZIP: Any 5 digits

## Deployment

To deploy this website:

1. Push the code to a GitHub repository

2. Connect your Vercel, Netlify, or similar hosting account to your GitHub repository

3. Deploy the website

4. Ensure your success URL and cancel URL in the Stripe Checkout session match your deployed domain

# EmailJS Setup Instructions

You have already set up your EmailJS account and created API keys. Here are the steps to complete the integration:

## Step 1: Create a Service in EmailJS

1. In your EmailJS dashboard, go to "Email Services" 
2. Click "Add New Service"
3. Choose your email provider (Gmail, Outlook, etc.)
4. Follow the prompts to connect your email account
5. Give your service a name (e.g., "BOC3-Filing-Service")
6. Once created, copy the **Service ID** (it will look like "service_xxxxxxx")

## Step 2: Create an Email Template

1. In your EmailJS dashboard, go to "Email Templates"
2. Click "Create New Template"
3. Give your template a name (e.g., "boc3-order-confirmation")
4. Paste the HTML template provided previously into the editor
5. In the "Test Variables" section, add these test values:
   - `to_email`: your test email
   - `to_name`: John Doe
   - `company_name`: ABC Trucking LLC
   - `order_number`: BOC-123456
   - `usdot`: 1234567
   - `pdf_attachment`: (Leave empty for testing)
6. Click "Save" and then "Test" to verify the template works
7. Copy the **Template ID** (it will look like "template_xxxxxxx")

## Step 3: Update the success.html file

1. In the success.html file, find this section of code:
```javascript
emailjs.send("service_xxxxxx", "template_xxxxxx", templateParams)
```
2. Replace "service_xxxxxx" with your Service ID
3. Replace "template_xxxxxx" with your Template ID
4. Save the file

Your EmailJS public key (O1SRnxMXLrWqtQSs3) has already been added to the code.

## Testing the EmailJS Integration

1. Go through the whole form and complete the payment process
2. On the success page, click "Email PDF"
3. Check your email inbox (and spam folder) for the confirmation email with PDF attachment

## Troubleshooting

If you're having issues with the email sending:

1. Check the browser console for error messages
2. Verify your Service ID and Template ID are correct
3. Make sure your email template has all the variables used in the code
4. Check your EmailJS dashboard for any quota limitations or errors

# Stripe Checkout Setup Instructions

Now that you've provided your Stripe publishable key (`pk_live_51LpCLtGInLr2DrSTO6ZA8MTfXUu6BW1buWOtrTKmmc4IpCsN0C1AS0wMSDplqnJjX1rj8DInTLhSzHYEM0pljDPW00IM7wZk4V`), you need to create a Checkout Session in Stripe to accept payments.

## Step 1: Create a Product in Stripe

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com/)
2. Go to **Products** → **Add Product**
3. Enter the following details:
   - **Name**: BOC-3 Process Agent Filing Service
   - **Description**: All 50 states coverage
   - **Pricing**: One-time payment of $150.00
   - **Tax behavior**: Inclusive (or whatever is appropriate for your business)
4. Click **Save Product**

## Step 2: Create a Checkout Session

You've already created your product with ID: `prod_S2Qg3r0d3jXTB4`. Now you need to:

1. Go to **Developers** → **Checkout** in your Stripe Dashboard
2. Click **Create your first Checkout** (or **Create new Checkout**)
3. Under **Products**, select your BOC-3 Filing product (ID: prod_S2Qg3r0d3jXTB4)
4. Under **Success page**:
   - Enter `https://yourdomain.com/success.html` (replace with your actual domain)
5. Under **Cancel page**:
   - Enter `https://yourdomain.com/index.html` (replace with your actual domain)
6. Under **Customer information**:
   - Enable the fields you want to collect (name, email, etc.)
7. Click **Create Checkout Session**
8. You'll see a page with code examples - look for a URL that looks like:
   ```
   https://checkout.stripe.com/c/pay/cs_live_XXXXXXXXXXXXXXXXXXXXXXXX
   ```
9. Copy this URL (or at least the `cs_live_XXXXXXXXXXXXXXXXXXXXXXXX` part)

## Step 3: Update Your Code

1. Open `script.js`
2. Find this line:
   ```javascript
   window.location.href = `https://checkout.stripe.com/c/pay/cs_live_YOURCHECKOUTSESSIONID?prefilled_email=${encodeURIComponent(formData.email)}`;
   ```
3. Replace `cs_live_YOURCHECKOUTSESSIONID` with the session ID you copied
4. Save the file

## Testing Your Integration

1. Fill out the form on your website
2. Complete the initials and signature on step 3
3. Click Submit
4. You should be redirected to the Stripe Checkout page
5. Complete a test payment using one of these test card numbers:
   - **Card number**: 4242 4242 4242 4242
   - **Expiration**: Any future date
   - **CVC**: Any 3 digits
   - **ZIP**: Any 5 digits
6. After payment, you should be redirected to your success page

## Going Live Checklist

Before accepting real payments, make sure to:

1. Test the entire flow multiple times
2. Verify that the success page works correctly
3. Check that the email with PDF is sent properly
4. Confirm that the Stripe Dashboard shows successful test payments
5. Review all content and pricing details for accuracy
6. Ensure your refund and privacy policies are available and up to date

## Alternative Steps to Create a Checkout Session

If you're having trouble finding the Checkout options in the new Stripe Dashboard design:

1. Go to **Developers** → **Create test data** in your Stripe Dashboard
2. Select **Checkout** from the list of options
3. In the form that appears:
   - Set payment to "One-time payment"
   - Under "Products", select your existing product (ID: prod_S2Qg3r0d3jXTB4)
   - Set the quantity to 1
   - Under "Success page URL", enter your success page URL (e.g., `https://yourdomain.com/success.html`)
   - Under "Cancel page URL", enter your cancel page URL (e.g., `https://yourdomain.com/index.html`)
4. Click **Create test data**
5. Look for the Checkout URL in the results box. It will look something like:
   ```
   https://checkout.stripe.com/c/pay/cs_test_XXXXXXXXXXXXXXXX
   ```
6. Copy this URL or just the session ID part (`cs_test_XXXXXXXXXXXXXXXX`)

**OR: Create a payment link**

Another easy way to create a checkout session:

1. Go to **Payments** → **Payment links** in your Stripe Dashboard
2. Click **Create payment link**
3. Under "Products", search and select your BOC-3 product (ID: prod_S2Qg3r0d3jXTB4)
4. Set quantity to 1
5. Configure any other settings you want
6. Click **Create link**
7. Copy the created payment link - this is the checkout URL you'll use in your code 

## 🔴 IMPORTANT: Stripe Setup Steps

You're getting an error because you need to create a Price ID in your Stripe Dashboard first. Follow these steps:

1. Log in to your Stripe Dashboard: https://dashboard.stripe.com/
2. Go to Products → Click on your existing product ("BOC-3 Process Agent Filing Service")
3. Click "Add pricing" or look for your existing price
4. Create a one-time price of $150.00
5. After creating the price, copy the Price ID (starts with "price_")
6. Replace the placeholder in script.js with your actual Price ID:
   ```javascript
   stripe.redirectToCheckout({
       mode: 'payment',
       lineItems: [{
           price: 'YOUR_PRICE_ID_HERE', // Replace this line
           quantity: 1
       }],
       // rest of the code
   ``` 