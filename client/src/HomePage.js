import "./App.css";
import { loadStripe } from "@stripe/stripe-js";

const public_stripe_key = process.env.REACT_APP_PUBLIC_STRIPE_KEY;

const HomePage = () => {
  const handlePayment = async () => {
    const stripePromise = await loadStripe(public_stripe_key);
    const response = await fetch(
      "http://localhost:3001/create-stripe-session",
      {
        method: "POST",
        headers: { "Content-Type": "Application/JSON" },
        body: JSON.stringify([
          { item: "Online Video Editor", qty: "3", itemCode: "99" },
        ]),
      }
    );
    const session = await response.json();
    stripePromise.redirectToCheckout({
      sessionId: session.id,
    });
  };

  return (
    <div className="App">
      <div
        style={{
          margin: "30px",
          borderWidth: "3px 9px 9px 9px",
          borderStyle: "solid",
          borderColor: "#FF6633",
          height: "100px",
          borderRadius: "10px",
        }}
      >
        Online Video Editor <br />
        Charges - 20INR For Lifetime <br />
        Quantity - 3 Copies <br />
        <button onClick={() => handlePayment()}> One Time Payment </button>
      </div>
    </div>
  );
};

export default HomePage;
