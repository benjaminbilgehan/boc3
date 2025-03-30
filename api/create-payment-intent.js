// This is a Vercel serverless function that handles creating payment intents
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, currency = 'usd', customer_email, customer_name, metadata = {} } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
    }

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      receipt_email: customer_email,
      metadata: {
        customer_name,
        ...metadata
      },
      // Enable capturing the payment automatically
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Return the client secret to the client
    res.status(200).json({ 
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ 
      error: error.message,
      type: error.type
    });
  }
}; 