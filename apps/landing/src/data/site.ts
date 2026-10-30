export const site = {
  name: "Mukund Maid Jewellers",
  shortName: "MMJ",
  wordmark: "Mukund Maid",
  tagline: "Tradition meets innovation — jewellery made for generations",
  description:
    "At Mukund Maid Jewellers, we believe in the art of jewellery making, where tradition meets innovation. Discover BIS-hallmarked gold, diamond and silver collections inspired by nature’s beauty and classic design — cherished for generations.",
  established: "1978",
  email: "customerservice@mmj.com",
  phones: ["+91 98226 72923", "+91 73853 02967"],
  whatsapp: "7385302967",
  domain: "mmjewellers.com",
  url: "https://www.mmjewellers.com",
  address: {
    lines: ["Mukund Maid Jewellers", "Main Road, Rahuri"],
    city: "Ahmednagar",
    state: "Maharashtra",
    pincode: "413705",
  },
  hours: "10am to 6pm, Tuesday to Sunday",
  closedOn: "Monday closed",
  mapUrl: "https://maps.app.goo.gl/ttGrwNSfCm5hRny49",
  social: [
    { label: "Instagram", href: "https://instagram.com" },
    { label: "Facebook", href: "https://facebook.com" },
    { label: "YouTube", href: "https://youtube.com" },
    { label: "WhatsApp", href: "https://wa.me/917385302967" },
  ],
};

export const announcements = [
  "BIS hallmarked, every single piece",
  "Free insured delivery above ₹25,000",
  "Lifetime exchange on all gold ornaments",
];

/** Top-level nav; each metal entry opens the mega panel of categories. */
export const mainNav = [
  { label: "Gold", href: "/shop/gold" },
  { label: "Diamond", href: "/shop/diamond" },
  { label: "Silver", href: "/shop/silver" },
  { label: "Bridal", href: "/collections/bridal-vault" },
  { label: "Men", href: "/shop/mens" },
];

export const footerColumns = [
  {
    title: "Shop",
    links: [
      { label: "All ornaments", href: "/shop" },
      { label: "Gold", href: "/shop/gold" },
      { label: "Diamond", href: "/shop/diamond" },
      { label: "Silver", href: "/shop/silver" },
      { label: "Platinum", href: "/shop/platinum" },
      { label: "Coins and bars", href: "/shop/bullion" },
      { label: "Collections", href: "/collections" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Today's rate", href: "/gold-rate" },
      { label: "Savings scheme", href: "/gold-savings-scheme" },
      { label: "Shipping and returns", href: "/shipping-returns" },
      { label: "Frequently asked", href: "/faq" },
      { label: "Contact us", href: "/contact" },
      { label: "My account", href: "/account" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Our story", href: "/about" },
      { label: "Visit the showroom", href: "/stores" },
      { label: "Journal", href: "/journal" },
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of use", href: "/terms" },
    ],
  },
];

/** Reasons to buy, shown as a four-up band. */
export const promises = [
  {
    index: "01",
    title: "BIS hallmarked",
    body: "Every ornament carries a six-digit HUID stamped by a government-licensed assay centre.",
  },
  {
    index: "02",
    title: "Transparent weight",
    body: "Gross weight, net weight and stone weight are printed on the estimate before you pay.",
  },
  {
    index: "03",
    title: "Lifetime exchange",
    body: "Exchange any gold ornament bought from us against the day's rate, for as long as you own it.",
  },
  {
    index: "04",
    title: "Made in our workshop",
    body: "Forty-eight karigars finish our gold by hand on the floor above the showroom.",
  },
];

export const faqs = [
  {
    question: "How is the price of a gold ornament calculated?",
    answer:
      "Metal value is the net weight multiplied by the day's rate for that purity. Making charges are added as a percentage of the metal value, stones are billed separately, then GST at three per cent on the metal and eighteen per cent on stones. Every product page shows this breakup in full.",
  },
  {
    question: "What does BIS hallmarked mean?",
    answer:
      "It means the purity has been independently assayed. Each piece carries the BIS mark, the purity grade and a six-character HUID that you can verify on the BIS Care app.",
  },
  {
    question: "Can I exchange old gold against a new purchase?",
    answer:
      "Yes. Bring your old ornaments to the Rahuri showroom. We weigh and test the purity in front of you, deduct the standard two per cent refining loss, and set the value against your new piece.",
  },
  {
    question: "Do you make ornaments to order?",
    answer:
      "We do. Share a reference or a sketch and our karigars will quote a weight range and a timeline, usually three to five weeks for bridal work.",
  },
  {
    question: "Is delivery insured?",
    answer:
      "All despatches travel fully insured and require a signature and OTP on delivery. Delivery is free above twenty-five thousand rupees.",
  },
  {
    question: "What is the MMJ savings scheme?",
    answer:
      "Pay a fixed amount every month for eleven months and we contribute the twelfth instalment. At maturity the full value is redeemable against any ornament in the showroom.",
  },
  {
    question: "Can I return a piece I have changed my mind about?",
    answer:
      "Unworn ornaments can be returned within fifteen days with the original estimate and tags for a full refund. Made-to-order and personalised pieces are exempt.",
  },
];
