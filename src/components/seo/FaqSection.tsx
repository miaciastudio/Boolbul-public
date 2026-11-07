import { FAQS } from "@/lib/faq";

/** Visible FAQ; pages that render it also emit matching FAQPage JSON-LD. */
export function FaqSection({ heading = "Questions founders ask" }: { heading?: string }) {
  return (
    <section className="mt-16 border-t-4 border-pitch pt-10" aria-labelledby="faq-heading">
      <h2 id="faq-heading" className="mb-6 text-3xl font-black uppercase tracking-tight text-pitch md:text-4xl">{heading}</h2>
      <div className="space-y-3">
        {FAQS.map((faq) => (
          <details key={faq.q} className="group border-3 border-pitch bg-white p-4 shadow-brutal-sm open:bg-cream">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-black text-pitch">
              <span>{faq.q}</span>
              <span aria-hidden="true" className="font-mono text-xl transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 font-mono text-sm leading-relaxed text-zinc-800">{faq.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
