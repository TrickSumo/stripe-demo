const express = require("express");
const cors = require("cors");
require("dotenv").config();
const bodyParser = require("body-parser");
const { MongoClient, ServerApiVersion } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const uri = process.env.MONGO_URI;
const endpointSecret = process.env.WEBHOOK_SIGNING_SECRET;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Connect to the client
client.connect();

const app = express();
app.use(cors());

app.use(bodyParser.raw({ type: "application/json" }));

// Route to create intent
// =====================================================================================
// =====================================================================================
// =====================================================================================

app.post("/create-stripe-session-subscription", async (req, res) => {
  const userEmail = "Helloo634@example.com"; // Replace with actual user email
  let customer;
  const auth0UserId = "OLR5eSFm2CEgn2U06Z";

  // Try to retrieve an existing customer by email
  const existingCustomers = await stripe.customers.list({
    email: userEmail,
    limit: 1,
  });

  //   console.log(existingCustomers);

  if (existingCustomers.data.length > 0) {
    // Customer already exists
    customer = existingCustomers.data[0];

    // Check if the customer already has an active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length > 0) {
      // Customer already has an active subscription, send them to biiling portal to manage subscription

      const stripeSession = await stripe.billingPortal.sessions.create({
        customer: customer.id,
        return_url: "https://example.com",
      });
      return res.status(409).json({ redirectUrl: stripeSession.url });
    }
  } else {
    // No customer found, create a new one
    customer = await stripe.customers.create({
      email: userEmail,
      metadata: {
        userId: auth0UserId, // Replace with actual Auth0 user ID
      },
    });

    //   console.log(customer);

    // Now create the Stripe checkout session with the customer ID
    const session = await stripe.checkout.sessions.create({
      success_url: "http://localhost:3000/success",
      cancel_url: "http://localhost:3000/cancel",
      payment_method_types: ["card"],
      mode: "subscription",
      billing_address_collection: "auto",
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: "Online Video Editor",
              description: "Unlimited Viedo Edits!",
            },
            unit_amount: 20000,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: auth0UserId,
      },
      // customer_email: "Hello63@example.com",
      customer: customer.id, // Use the customer ID here
    });

    res.json({ id: session.id });
  }
});

// Order fulfilment route
// =====================================================================================
// =====================================================================================
// =====================================================================================

// webhook for subscription
app.post("/webhook", async (req, res) => {
  const db = client.db("subDB");
  const subscriptions = db.collection("subscriptions");

  const payload = req.body;
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object;

    // On payment successful, get subscription and customer details
    const subscription = await stripe.subscriptions.retrieve(
      event.data.object.subscription
    );
    const customer = await stripe.customers.retrieve(
      event.data.object.customer
    );

    //   console.log(subscription,customer);

    if (invoice.billing_reason === "subscription_create") {
      // Handle the first successful payment
      // DB code to update the database for first subscription payment

      const subscriptionDocument = {
        userId: customer?.metadata?.userId,
        subId: event.data.object.subscription,
        endDate: subscription.current_period_end * 1000,
      };

      // // Insert the document into the collection
      const result = await subscriptions.insertOne(subscriptionDocument);
      console.log(`A document was inserted with the _id: ${result.insertedId}`);
      console.log(
        `First subscription payment successful for Invoice ID: ${customer.email} ${customer?.metadata?.userId}`
      );
    } else if (
      invoice.billing_reason === "subscription_cycle" ||
      invoice.billing_reason === "subscription_update"
    ) {
      // Handle recurring subscription payments
      // DB code to update the database for recurring subscription payments

      // Define the filter to find the document with the specified userId
      const filter = { userId: customer?.metadata?.userId };

      // Define the update operation to set the new endDate
      const updateDoc = {
        $set: {
          endDate: subscription.current_period_end * 1000,
          recurringSuccessful_test: true,
        },
      };

      // Update the document
      const result = await subscriptions.updateOne(filter, updateDoc);

      if (result.matchedCount === 0) {
        console.log("No documents matched the query. Document not updated");
      } else if (result.modifiedCount === 0) {
        console.log(
          "Document matched but not updated (it may have the same data)"
        );
      } else {
        console.log(`Successfully updated the document`);
      }

      console.log(
        `Recurring subscription payment successful for Invoice ID: ${invoice.id}`
      );
    }

    console.log(
      new Date(subscription.current_period_end * 1000),
      subscription.status,
      invoice.billing_reason
    );
  }

  res.status(200).end();
});

app.listen(3001, () => {
  console.log("Server is running on port 3001");
});

process.on("SIGINT", () => {
  client.close().then(() => {
    console.log("MongoDB disconnected on app termination");
    process.exit(0);
  });
});
