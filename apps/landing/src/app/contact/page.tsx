import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Shell } from "@/components/ui/Shell";
import { Panel } from "@/components/ui/Panel";
import { PageHeader } from "@/components/ui/PageHeader";
import { Accordion } from "@/components/ui/Accordion";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ArrowCta } from "@/components/ui/Button";
import { ContactForm } from "@/components/contact/ContactForm";
import { faqs, site } from "@/data/site";

export const metadata: Metadata = {
  title: "Contact us",
  description: `Call, WhatsApp or visit Mukund Maid Jewellers on Main Road, Rahuri. Open ${site.hours}.`,
};

export default function ContactPage() {
  const channels = [
    {
      icon: Phone,
      label: "Call the counter",
      lines: site.phones,
      href: `tel:${site.phones[0].replace(/\s/g, "")}`,
    },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      lines: [`+91 ${site.whatsapp}`],
      href: `https://wa.me/91${site.whatsapp}`,
    },
    { icon: Mail, label: "Email", lines: [site.email], href: `mailto:${site.email}` },
    {
      icon: MapPin,
      label: "Showroom",
      lines: [
        ...site.address.lines,
        `${site.address.city}, ${site.address.state} ${site.address.pincode}`,
      ],
      href: site.mapUrl,
    },
  ];

  return (
    <>
      <PageHeader
        title="Talk to us"
        lead={`The showroom is open ${site.hours.toLowerCase()}. ${site.closedOn}. Whichever way you reach us, a person answers.`}
        trail={[{ label: "Home", href: "/" }, { label: "Contact" }]}
      />

      <Shell className="py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,440px)] lg:gap-16">
          <div>
            <ul className="grid gap-px border border-line bg-line sm:grid-cols-2">
              {channels.map((channel) => (
                <li key={channel.label} className="bg-paper p-6">
                  <channel.icon className="size-4 text-gold" aria-hidden />
                  <p className="eyebrow mt-4 text-[9px] text-stone">{channel.label}</p>
                  <div className="mt-2.5 space-y-0.5">
                    {channel.lines.map((line) => (
                      <p key={line} className="text-[13px] leading-relaxed text-ink">
                        {line}
                      </p>
                    ))}
                  </div>
                  <a
                    href={channel.href}
                    target={channel.href.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer noopener"
                    className="eyebrow mt-4 inline-block text-[9px] text-ash underline-offset-4 hover:text-ink hover:underline"
                  >
                    {channel.href.startsWith("http") ? "Open" : "Reach out"}
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-10 border border-line bg-cream-deep p-7">
              <p className="eyebrow text-[9px] text-stone">Before you come in</p>
              <ul className="mt-5 space-y-3 text-[13px] leading-relaxed text-ash">
                {[
                  "Bringing old gold to exchange? Carry the original estimate if you still have it. We test purity in front of you either way.",
                  "Want something made? A photograph is enough to start. We will quote a weight band and a timeline on the spot.",
                  "Coming for a bridal set? Call ahead so we can lay out the vault before you arrive.",
                ].map((note) => (
                  <li key={note} className="flex gap-3">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-gold" aria-hidden />
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <ContactForm />
        </div>
      </Shell>

      <Panel tone="cream">
        <SectionHeading
          label="Frequently asked"
          action={<ArrowCta href="/faq">All questions</ArrowCta>}
        />
        <div className="mt-10">
          <Accordion items={faqs.slice(0, 4)} defaultOpen={0} />
        </div>
      </Panel>
    </>
  );
}
