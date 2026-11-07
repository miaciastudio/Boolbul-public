// Visible FAQ copy. The same text feeds FAQPage JSON-LD, so schema always matches the page.
export const FAQS = [
  {
    q: "What does BoolBul do?",
    a: "When a customer clicks Cancel in your app, BoolBul shows a one-tap exit survey and offers the right thing for their reason — a discount or a pause — with a one-click cancel link always visible. If they accept, your server applies the offer with Dodo Payments or Stripe.",
  },
  {
    q: "Which billing providers are supported?",
    a: "Dodo Payments and Stripe today. Paddle, Lemon Squeezy, Polar and Chargebee are coming soon.",
  },
  {
    q: "Do I have to share my Stripe or Dodo Payments API keys?",
    a: "No. The widget gets a signed, single-use offer token from BoolBul; your own server verifies it with your signing secret and calls your gateway. Your gateway keys never leave your server.",
  },
  {
    q: "What happens if BoolBul is slow or down?",
    a: "The widget fails open: if BoolBul doesn't answer within 1.5 seconds it steps aside and your normal cancellation runs, so customers can always cancel.",
  },
  {
    q: "Is it compliant with click-to-cancel laws?",
    a: "BoolBul is built so cancelling stays as easy as signing up: the cancel link is on every screen, single-click, high-contrast and never hidden, and shaming labels are blocked. Rules vary by state and are evolving, so review your own flow with counsel.",
  },
  {
    q: "How much does it cost?",
    a: "The first 100 approved SaaS founders get Pro free for 3 months with no credit card. After that, Starter is $19/month for up to 500 saved subscribers and Pro is $49/month for unlimited saves.",
  },
  {
    q: "Does it work in mobile apps?",
    a: "Yes. Native and hybrid apps open the hosted BoolBul page in a WebView (React Native, Flutter, iOS, Android) and receive the outcome as a message. Subscriptions billed through Apple or Google in-app purchases are cancelled by those stores, so BoolBul applies to Dodo Payments and Stripe billing.",
  },
] as const;
