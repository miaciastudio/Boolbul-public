import Image from "next/image";
import Link from "next/link";

const COLUMNS = [
  { title: "Product", links: [["Pricing", "/pricing"], ["Live demo", "/demo"], ["Claim 3 months free", "/login?mode=apply"], ["Sign in", "/login"]] },
  { title: "Developers", links: [["Docs", "/docs"], ["Quickstart", "/docs/quickstart"], ["Client SDK", "/docs/client-sdk"], ["Server adapters", "/docs/server-adapters"], ["Mobile apps", "/docs/mobile-apps"]] },
  { title: "Compare & learn", links: [["vs Stripe customer portal", "/vs/stripe-portal"], ["vs Churnkey", "/vs/churnkey"], ["FTC click-to-cancel guide", "/compliance/ftc-click-to-cancel"]] },
  { title: "Open source", links: [["GitHub", "https://github.com/miaciastudio/Boolbul-public"], ["npm @boolbul/sdk", "https://www.npmjs.com/package/@boolbul/sdk"], ["llms.txt", "/llms.txt"], ["hello@boolbul.com", "mailto:hello@boolbul.com"]] },
] as const;

export function Footer() {
  return (
    <footer className="mt-20 border-t-4 border-pitch pt-8 font-mono text-xs">
      <nav aria-label="Footer" className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="mb-2 font-black uppercase text-pitch">{col.title}</p>
            <ul className="space-y-1.5">
              {col.links.map(([label, href]) => (
                <li key={href}>
                  {href.startsWith("/") ? <Link href={href} className="text-zinc-700 hover:text-pitch hover:underline">{label}</Link>
                    : <a href={href} className="text-zinc-700 hover:text-pitch hover:underline" {...(href.startsWith("http") ? { target: "_blank", rel: "noopener" } : {})}>{label}</a>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t-2 border-pitch pt-5 sm:flex-row">
        <div className="flex items-center gap-2">
          <Image src="/brand/logo.png" alt="BoolBul" width={24} height={24} />
          <span className="font-bold">BOOLBUL.COM</span>
          <span className="text-zinc-500">— In-app cancellation flows for Dodo Payments & Stripe</span>
        </div>
        <span className="text-zinc-600">© {new Date().getFullYear()} BoolBul · Open core (AGPL-3.0)</span>
      </div>
    </footer>
  );
}
