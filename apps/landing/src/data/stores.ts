import type { Store } from "@/types";
import { site } from "@/data/site";

export const stores: Store[] = [
  {
    slug: "rahuri",
    name: "MMJ Rahuri",
    addressLines: ["Mukund Maid Jewellers", "Main Road, Rahuri"],
    city: "Ahmednagar",
    state: "Maharashtra",
    pincode: "413705",
    phone: site.phones[0],
    mapUrl: site.mapUrl,
    hours: site.hours,
    closedOn: site.closedOn,
    image: "/images/lifestyle/life-showroom.webp",
  },
];

export function getStore(slug: string) {
  return stores.find((store) => store.slug === slug);
}
