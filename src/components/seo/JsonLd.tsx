import { ldJson } from "@/lib/seo";

export function JsonLd({ nodes }: { nodes: object[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(...nodes) }} />;
}
