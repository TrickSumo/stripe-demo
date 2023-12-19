# stripe-demo

**SESSION Creation ROUTE**

    If existing customer

        Yes==============================================

            Is already subscribed?

                Yes => send to subscription management

                No => send to checkout page

        No===============================================

            1. Create new customer account in stripe
            2. Send To checkout page

**WEBHOOK ROUTE**

    Billing Reason is Subscription Created?
        Insert Record in DB
    Billing Reason is Subscription Update?
        Update Record in DB

**Commands:-**

- `stripe login`
- `stripe listen --forward-to localhost:3001/webhook-onetime-payment`

**Docs:-**

- [Stripe API - Create Checkout Session](https://stripe.com/docs/api/checkout/sessions/create)
- [How Stripe Checkout Works](https://stripe.com/docs/payments/checkout/how-checkout-works)
