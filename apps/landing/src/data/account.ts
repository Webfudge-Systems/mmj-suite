/** Placeholder account data so the dashboard has something honest to render. */
export const customer = {
  name: "Anjali Deshmukh",
  email: "anjali.deshmukh@example.com",
  phone: "+91 98220 41188",
  memberSince: "2019",
  addresses: [
    {
      label: "Home",
      lines: ["Flat 4, Shantiniketan", "Savedi Road", "Ahmednagar, Maharashtra 414003"],
      isDefault: true,
    },
    {
      label: "Parents",
      lines: ["Maid Wada", "Main Road", "Rahuri, Maharashtra 413705"],
      isDefault: false,
    },
  ],
};

export type Order = {
  id: string;
  placedOn: string;
  status: "delivered" | "in-workshop" | "dispatched";
  total: number;
  items: { slug: string; quantity: number }[];
};

export const orders: Order[] = [
  {
    id: "MMJ-24118",
    placedOn: "2026-08-14",
    status: "delivered",
    total: 284_600,
    items: [{ slug: "kalyani-temple-necklace", quantity: 1 }],
  },
  {
    id: "MMJ-24096",
    placedOn: "2026-07-02",
    status: "delivered",
    total: 61_300,
    items: [
      { slug: "tulsi-daily-mangalsutra", quantity: 1 },
      { slug: "mogra-gold-studs", quantity: 1 },
    ],
  },
  {
    id: "MMJ-24132",
    placedOn: "2026-09-18",
    status: "in-workshop",
    total: 412_900,
    items: [{ slug: "rukmini-carved-bangles", quantity: 1 }],
  },
];

export const statusLabels: Record<Order["status"], string> = {
  delivered: "Delivered",
  dispatched: "Dispatched",
  "in-workshop": "In the workshop",
};

/** The eleven-month gold savings scheme the showroom runs. */
export const scheme = {
  plan: "Swarna Nidhi",
  monthly: 10_000,
  paid: 7,
  term: 11,
  gramsAccrued: 6.712,
};
