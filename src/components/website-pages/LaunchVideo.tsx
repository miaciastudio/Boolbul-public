export const LAUNCH_VIDEO_ID = "XsoXoD3kbAc";

export const launchVideoLd = {
  "@type": "VideoObject",
  name: "How to Stop SaaS Churn at the Edge (In-App Retention Flow) | BoolBul",
  description:
    "How BoolBul turns cancel clicks into reason-matched offers: exit survey, pause and discount offers, one-click cancel. In-app cancellation flow for SaaS on Dodo Payments and Stripe.",
  thumbnailUrl: [`https://i.ytimg.com/vi/${LAUNCH_VIDEO_ID}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${LAUNCH_VIDEO_ID}/hqdefault.jpg`],
  uploadDate: "2026-11-08T00:00:00+05:30",
  duration: "PT30S",
  contentUrl: `https://www.youtube.com/watch?v=${LAUNCH_VIDEO_ID}`,
  embedUrl: `https://www.youtube.com/embed/${LAUNCH_VIDEO_ID}`,
  publisher: { "@id": "https://boolbul.com/#organization" },
};

/** 30s launch video (YouTube, privacy-enhanced embed, lazy-loaded). */
export function LaunchVideo() {
  return (
    <section aria-labelledby="launch-video-title" className="mt-16">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <h2 id="launch-video-title" className="text-2xl font-black uppercase tracking-tight text-pitch sm:text-3xl">
          See BoolBul in 30 seconds
        </h2>
        <span className="border-2 border-pitch bg-lime px-2.5 py-1 font-mono text-xs font-bold uppercase shadow-brutal-sm">
          Sound on 🔊
        </span>
      </div>
      <div className="relative aspect-video w-full overflow-hidden border-4-black bg-pitch shadow-brutal-xl">
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${LAUNCH_VIDEO_ID}?rel=0`}
          title="BoolBul in 30 seconds — launch video"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </section>
  );
}
