import { DEFAULT_CONFIG, normalizeConfig, type ReasonId, type WidgetConfig } from "./config";
import { parseOffers, type Offer } from "./offers";
import { WidgetView, type Step } from "./view";

export * from "./config";
export { describeOffer, selectOffers, formatMoney, type Offer, type OfferCopy } from "./offers";
export type { Step } from "./view";

export const VERSION = "1.0.0";
/** Hard SLA: if BoolBul can't answer in time, the host's own cancellation runs. */
export const FAIL_OPEN_MS = 1500;
const DEFAULT_API = "https://boolbul.com";

export interface AcceptedOffer {
  /** Signed HS256 token. Verify it on YOUR server with your signing secret, then apply it with your billing provider. */
  offerJwt: string;
  offerType: "discount" | "pause";
  /** Discount: basis points (5000 = 50%). Pause: days. */
  offerValue: number;
  discountDurationMonths?: number;
  reasonId: ReasonId | null;
  customerId: string;
  subscriptionId: string;
}

export interface CancelDetails {
  /** Maps 1:1 to Dodo `cancellation_feedback` and Stripe `cancellation_details.feedback`. */
  reasonId: ReasonId | null;
  comment: string | null;
  /** True when BoolBul was unreachable and stepped aside (fail-open). */
  failedOpen: boolean;
}

export interface OpenOptions {
  publicKey: string;
  customerId: string;
  subscriptionId: string;
  /** Monthly revenue of this subscription, in cents. Powers the saved-MRR dashboard. */
  mrrCents?: number;
  /** Current price in cents, used to show "Pay $24.50 instead of $49". Defaults to mrrCents. */
  planPriceCents?: number;
  currency?: string;
  /** Apply the offer on your server. Resolve when done; reject to show a retry message. */
  onOfferAccepted(offer: AcceptedOffer): Promise<unknown> | unknown;
  /** Run your normal cancellation. Called on the escape hatch AND on fail-open. */
  onCancel(details: CancelDetails): void;
  /** Customer closed the dialog and keeps their subscription. */
  onDismiss?(): void;
  apiBase?: string;
}

export interface PreviewOptions {
  config?: Partial<WidgetConfig> | unknown;
  viewport?: "mobile" | "desktop";
  planPriceCents?: number;
  currency?: string;
  offers?: Offer[];
  step?: Step;
}

export interface PreviewHandle {
  update(options: PreviewOptions): void;
  destroy(): void;
}

export const SAMPLE_OFFERS: Offer[] = [
  { ruleId: "sample:discount", offerType: "discount", offerValue: 5000, discountDurationMonths: 2 },
  { ruleId: "sample:pause", offerType: "pause", offerValue: 30, discountDurationMonths: 0 },
];

let active: { close(): void } | null = null;

/**
 * Opens the TLS connection to BoolBul as soon as the SDK loads, so the
 * session request on "Cancel" doesn't pay for DNS + TLS inside the 1.5 s budget.
 */
export function preconnect(apiBase = DEFAULT_API): void {
  if (typeof document === "undefined" || !document.head) return;
  const origin = new URL(apiBase).origin;
  if (document.head.querySelector(`link[rel="preconnect"][href="${origin}"]`)) return;
  const link = document.createElement("link");
  link.rel = "preconnect";
  link.href = origin;
  link.crossOrigin = "anonymous";
  document.head.append(link);
}
if (typeof window !== "undefined") {
  try { preconnect(); } catch { /* non-browser or locked-down document */ }
}

function isId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 256 && value.trim() === value;
}

async function post(url: string, body: unknown, timeoutMs: number, keepalive = false): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      signal: controller.signal, keepalive, credentials: "omit",
    });
    const data = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) throw Object.assign(new Error(String(data.error ?? response.status)), { data });
    return data;
  } finally {
    clearTimeout(timer);
  }
}

async function getConfig(api: string, publicKey: string, timeoutMs: number): Promise<WidgetConfig> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${api}/api/v1/widget-config/${encodeURIComponent(publicKey)}`, { signal: controller.signal, credentials: "omit" });
    return normalizeConfig(response.ok ? await response.json() : {});
  } catch {
    return DEFAULT_CONFIG;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Opens the retention flow. Call it from your "Cancel subscription" button
 * instead of cancelling directly. BoolBul calls `onCancel` if the customer
 * proceeds, or if BoolBul itself is unavailable within 1.5s.
 */
export async function open(options: OpenOptions): Promise<void> {
  const proceed = (reasonId: ReasonId | null = null, comment: string | null = null, failedOpen = false) =>
    options.onCancel({ reasonId, comment: comment?.trim() || null, failedOpen });
  if (typeof window === "undefined") return;
  if (!isId(options.publicKey) || !isId(options.customerId) || !isId(options.subscriptionId) ||
      typeof options.onCancel !== "function" || typeof options.onOfferAccepted !== "function") {
    console.error("[BoolBul] open() needs publicKey, customerId, subscriptionId, onOfferAccepted and onCancel.");
    if (typeof options.onCancel === "function") proceed(null, null, true);
    return;
  }
  active?.close();
  const api = (options.apiBase ?? DEFAULT_API).replace(/\/$/, "");
  const mrrCents = Number.isSafeInteger(options.mrrCents) && options.mrrCents! >= 0 ? options.mrrCents! : 0;
  let initToken = "";
  let closed = false;

  const beacon = (event: "shown" | "cancelled", reasonId: ReasonId | null = null, comment: string | null = null) => {
    if (!initToken) return;
    void post(`${api}/api/v1/intercept/outcome`, { initToken, event, reasonId, comment }, 4000, true).catch(() => undefined);
  };
  const close = () => {
    if (closed) return;
    closed = true;
    view.destroy();
    if (active === handle) active = null;
  };
  const handle = { close };

  const view = new WidgetView({
    config: DEFAULT_CONFIG,
    planPriceCents: options.planPriceCents ?? (mrrCents || undefined),
    currency: options.currency,
    onDismiss: () => { close(); options.onDismiss?.(); },
    onCancel: (reasonId, comment) => { beacon("cancelled", reasonId, comment); close(); proceed(reasonId, comment); },
    onAccept: async (offer, reasonId) => {
      view.setState({ step: "processing", error: null });
      try {
        const claim = await post(`${api}/api/v1/intercept/claim`, { initToken, selection: offer.ruleId, reasonId }, 6000);
        if (typeof claim.offerJwt !== "string") throw new Error("offer_unavailable");
        await options.onOfferAccepted({
          offerJwt: claim.offerJwt, offerType: offer.offerType, offerValue: offer.offerValue,
          discountDurationMonths: offer.offerType === "discount" ? offer.discountDurationMonths : undefined,
          reasonId, customerId: options.customerId, subscriptionId: options.subscriptionId,
        });
        if (!closed) view.setState({ step: "success" });
      } catch (error) {
        const code = (error as { message?: string })?.message;
        const message = code === "already_claimed" ? "This offer was already used for this cancellation."
          : code === "expired" ? "This session timed out. Close and try again."
            : "We couldn't apply that offer. Try again, or cancel below.";
        if (!closed) view.setState({ step: "offers", error: message });
      }
    },
  });
  active = handle;
  view.mount();

  // Only the session (init) decides fail-open. The design loads in parallel and,
  // if it is slower than the session, the compliant default theme is used.
  const started = Date.now();
  const configPromise = getConfig(api, options.publicKey, FAIL_OPEN_MS + 1000);
  const deadline = new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), FAIL_OPEN_MS));
  const initResult = await Promise.race([
    post(`${api}/api/v1/intercept/init`, {
      publicKey: options.publicKey, customerId: options.customerId, subscriptionId: options.subscriptionId, mrrCents,
    }, FAIL_OPEN_MS).catch(() => "error" as const),
    deadline,
  ]);
  if (closed) return;
  if (initResult === "timeout" || initResult === "error" || initResult.failOpen !== false || typeof initResult.initToken !== "string") {
    close();
    proceed(null, null, true);
    return;
  }
  const init = initResult;
  const grace = Math.max(250, FAIL_OPEN_MS - (Date.now() - started));
  const config = await Promise.race([configPromise, new Promise<WidgetConfig>((resolve) => setTimeout(() => resolve(DEFAULT_CONFIG), grace))]);
  if (closed) return;
  initToken = init.initToken as string;
  const offers = parseOffers(init.rules);
  const usable = config.offerMode === "survey_only" ? [] : offers;
  if (!config.surveyEnabled && usable.length === 0) {
    close();
    proceed(null, null, false);
    return;
  }
  view.update({ config });
  view.setState({ step: config.surveyEnabled ? "survey" : "offers", offers: usable });
  beacon("shown");
}

/** Closes an open widget without cancelling anything. */
export function close(): void {
  active?.close();
}

/**
 * Renders the widget inside `target` with sample offers and no network calls.
 * The dashboard customizer, the demo and the landing page all use this, so the
 * preview is exactly what customers will see.
 */
export function preview(target: HTMLElement, options: PreviewOptions = {}): PreviewHandle {
  let current = { ...options };
  const config = () => normalizeConfig(current.config ?? {});
  const view = new WidgetView({
    config: config(),
    inline: target,
    viewport: current.viewport ?? "desktop",
    planPriceCents: current.planPriceCents ?? 4900,
    currency: current.currency,
    onDismiss: () => view.setState({ step: config().surveyEnabled ? "survey" : "offers", reason: null, error: null }),
    onCancel: () => view.setState({ step: "error", error: "Preview: this is where your app's own cancellation runs. Nothing was cancelled." }),
    onAccept: () => {
      view.setState({ step: "processing" });
      setTimeout(() => view.setState({ step: "success" }), 700);
    },
  }, { step: current.step ?? (config().surveyEnabled ? "survey" : "offers"), offers: current.offers ?? SAMPLE_OFFERS });
  view.mount();
  return {
    update(next) {
      current = { ...current, ...next };
      view.update({ config: config(), viewport: current.viewport ?? "desktop", planPriceCents: current.planPriceCents ?? 4900, currency: current.currency });
      if (next.offers) view.setState({ offers: next.offers });
      if (next.step) view.setState({ step: next.step });
      else if (next.config && view.getState().step === "survey" && !config().surveyEnabled) view.setState({ step: "offers" });
      else if (next.config && view.getState().step === "offers" && config().surveyEnabled && !view.getState().reason) view.setState({ step: "survey" });
    },
    destroy() { view.destroy(); },
  };
}

export const BoolBul = { open, close, preview, preconnect, version: VERSION };
export default BoolBul;
