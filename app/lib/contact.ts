import type { Branch } from "~/content/schema";

/** "+961 3 374 344" → "tel:+9613374344" */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** WhatsApp click-to-chat link with an optional pre-filled message. */
export const whatsappHref = (branch: Branch, text?: string) => `https://wa.me/${branch.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export const directionsHref = (branch: Branch) =>
  `https://www.google.com/maps/dir/?api=1&destination=${branch.geo.lat},${branch.geo.lng}&destination_place_id=${branch.googlePlaceId}`;

export const googleReviewsHref = (branch: Branch) => `https://search.google.com/local/reviews?placeid=${branch.googlePlaceId}`;

export const mapEmbedSrc = (branch: Branch) => `https://maps.google.com/maps?q=${branch.geo.lat},${branch.geo.lng}&z=16&output=embed`;
