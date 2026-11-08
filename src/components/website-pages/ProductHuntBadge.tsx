export const PRODUCT_HUNT_URL = "https://www.producthunt.com/products/boolbul";

const BADGE_HREF = `${PRODUCT_HUNT_URL}?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-boolbul`;
const BADGE_SRC = "https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1308552&theme=light&t=1794125282847";

/** Official Product Hunt "Featured" launch badge (live upvote count, served by Product Hunt). */
export function ProductHuntBadge({ className = "" }: { className?: string }) {
  return (
    <a href={BADGE_HREF} target="_blank" rel="noopener noreferrer" className={`inline-block shrink-0 ${className}`}
      aria-label="BoolBul on Product Hunt — upvote our launch">
      {/* eslint-disable-next-line @next/next/no-img-element -- external live SVG badge, must not be proxied */}
      <img src={BADGE_SRC} alt="BoolBul - In-app edge cancellation flow to save churning SaaS MRR | Product Hunt"
        width={250} height={54} loading="eager" decoding="async" style={{ width: 250, height: 54 }} />
    </a>
  );
}
