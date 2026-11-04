import type { Schema, Struct } from "@strapi/strapi";

export interface PricingMaking extends Struct.ComponentSchema {
  collectionName: "components_pricing_makings";
  info: {
    description: "Per gram, a percentage of metal value, or a fixed amount.";
    displayName: "Making charge";
  };
  attributes: {
    type: Schema.Attribute.Enumeration<["per_gram", "percent", "fixed"]> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<"per_gram">;
    value: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
  };
}

export interface ProductHallmark extends Struct.ComponentSchema {
  collectionName: "components_product_hallmarks";
  info: {
    description: "BIS mark and the six-character HUID stamped on the piece.";
    displayName: "Hallmark";
  };
  attributes: {
    bis: Schema.Attribute.Boolean & Schema.Attribute.Required & Schema.Attribute.DefaultTo<true>;
    huid: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ProductSizeOption extends Struct.ComponentSchema {
  collectionName: "components_product_size_options";
  info: {
    description: "A selectable ring, bangle or chain size.";
    displayName: "Size option";
  };
  attributes: {
    value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ProductSpec extends Struct.ComponentSchema {
  collectionName: "components_product_specs";
  info: {
    description: "A labelled specification row on the product page.";
    displayName: "Spec";
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
    value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ProductStoneDetail extends Struct.ComponentSchema {
  collectionName: "components_product_stone_details";
  info: {
    description: "A group of stones set in a piece: type, count, carat, grading.";
    displayName: "Stone detail";
  };
  attributes: {
    carat: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    clarity: Schema.Attribute.String;
    colour: Schema.Attribute.String;
    count: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    type: Schema.Attribute.Enumeration<
      ["diamond", "polki", "ruby", "emerald", "sapphire", "pearl"]
    > &
      Schema.Attribute.Required;
  };
}

export interface RatesRateLine extends Struct.ComponentSchema {
  collectionName: "components_rates_rate_lines";
  info: {
    description: "Rate per gram for one purity.";
    displayName: "Rate line";
  };
  attributes: {
    metal: Schema.Attribute.Enumeration<["gold", "silver", "platinum"]> & Schema.Attribute.Required;
    purity: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 8;
      }>;
    ratePerGram: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
  };
}

export interface SharedFaqItem extends Struct.ComponentSchema {
  collectionName: "components_shared_faq_items";
  info: {
    description: "A question and its answer.";
    displayName: "FAQ item";
  };
  attributes: {
    answer: Schema.Attribute.Text & Schema.Attribute.Required;
    question: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedFooterColumn extends Struct.ComponentSchema {
  collectionName: "components_shared_footer_columns";
  info: {
    description: "A titled group of links in the site footer.";
    displayName: "Footer column";
  };
  attributes: {
    links: Schema.Attribute.Component<"shared.nav-link", true> & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedNavLink extends Struct.ComponentSchema {
  collectionName: "components_shared_nav_links";
  info: {
    description: "A labelled path used in the header, footer and menus.";
    displayName: "Nav link";
  };
  attributes: {
    href: Schema.Attribute.String & Schema.Attribute.Required;
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedPromise extends Struct.ComponentSchema {
  collectionName: "components_shared_promises";
  info: {
    description: "A numbered reason to buy, shown on home and about.";
    displayName: "Promise";
  };
  attributes: {
    body: Schema.Attribute.Text & Schema.Attribute.Required;
    index: Schema.Attribute.String & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: "components_shared_seos";
  info: {
    description: "Optional overrides for title, description and social image.";
    displayName: "SEO";
  };
  attributes: {
    metaDescription: Schema.Attribute.Text;
    metaTitle: Schema.Attribute.String;
    shareImage: Schema.Attribute.Media<"images">;
  };
}

export interface SharedShowroomHours extends Struct.ComponentSchema {
  collectionName: "components_shared_showroom_hours";
  info: {
    description: "Opening hours for a given set of days.";
    displayName: "Showroom hours";
  };
  attributes: {
    days: Schema.Attribute.String & Schema.Attribute.Required;
    time: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface SharedSocialLink extends Struct.ComponentSchema {
  collectionName: "components_shared_social_links";
  info: {
    description: "A labelled URL for Instagram, WhatsApp and the rest.";
    displayName: "Social link";
  };
  attributes: {
    href: Schema.Attribute.String & Schema.Attribute.Required;
    label: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module "@strapi/strapi" {
  export namespace Public {
    export interface ComponentSchemas {
      "pricing.making": PricingMaking;
      "product.hallmark": ProductHallmark;
      "product.size-option": ProductSizeOption;
      "product.spec": ProductSpec;
      "product.stone-detail": ProductStoneDetail;
      "rates.rate-line": RatesRateLine;
      "shared.faq-item": SharedFaqItem;
      "shared.footer-column": SharedFooterColumn;
      "shared.nav-link": SharedNavLink;
      "shared.promise": SharedPromise;
      "shared.seo": SharedSeo;
      "shared.showroom-hours": SharedShowroomHours;
      "shared.social-link": SharedSocialLink;
    }
  }
}
