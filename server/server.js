const express = require("express");
const cors = require("cors");
require("dotenv").config();
const bodyParser = require("body-parser");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Find your endpoint's secret in your Dashboard's webhook settings
const endpointSecret = process.env.WEBHOOK_SIGNING_SECRET;

const app = express();
app.use(cors());
app.use(bodyParser.raw({ type: "application/json" }));

// Route to create intent
// =====================================================================================

app.post("/create-stripe-session", async (req, res) => {
  const quantity = JSON.parse(req.body.toString())[0].qty;
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "inr",
          product_data: {
            name: "Online Video Editor",
            description: "Unlimited Viedo Edits!",
          },
          unit_amount: 2000,
        },
        quantity: quantity,
      },
    ],
    mode: "payment",
    success_url: "http://localhost:3000/success",
    cancel_url: "http://localhost:3000/cancel",
    // customer_email: "hello@tricksumo.com",
    // // Add this to collect shipping address
    // shipping_address_collection: {
    //   allowed_countries: ["IN", "NP", "US"], // Allow all countries, or specify an array of country codes
    // },
  });
  res.json({ id: session.id });
});

// Order fulfilment route
// =====================================================================================

app.post("/webhook-onetime-payment", async (req, res) => {
  const payload = req.body;
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    console.log(event);
    const sessionDetails = await stripe.checkout.sessions.retrieve(
      event.data.object.id,
      {
        expand: ["line_items", "customer"],
      }
    );
    const lineItems = sessionDetails.line_items;
    console.log("Paid for items :- \n", lineItems.data);

    const customerDetails = sessionDetails.customer_details;

    if (event.data.object.payment_status === "paid") {
      console.log("Payment Success for customer:-", customerDetails.email);
      // Store payment data and mark payment as complete in DB
    }
    // Delayed payment scenarios https://stripe.com/docs/payments/checkout/fulfill-orders#delayed-notification
  }
  res.status(200).end();
});

// Start the server on port 3000
app.listen(3001, () => {
  console.log("Server is running on port 3001");
});
