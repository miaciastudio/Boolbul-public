import type { ReasonId, WidgetConfig } from "./config";
import { describeOffer, offerHeading, selectOffers, type Offer } from "./offers";
import { buildStyles } from "./styles";

export type Step = "loading" | "survey" | "offers" | "processing" | "success" | "error";

export interface ViewState {
  step: Step;
  reason: ReasonId | null;
  comment: string;
  offers: Offer[];
  error: string | null;
}

export interface ViewOptions {
  config: WidgetConfig;
  /** Render inside this element (dashboard preview) instead of over the whole page. */
  inline?: HTMLElement;
  /** Forces the mobile or desktop layout (preview). Live mode follows the screen width. */
  viewport?: "mobile" | "desktop";
  planPriceCents?: number;
  currency?: string;
  onAccept(offer: Offer, reason: ReasonId | null): void;
  onCancel(reason: ReasonId | null, comment: string): void;
  onDismiss(): void;
  onReasonChosen?(reason: ReasonId): void;
}

type Child = Node | string | null | false | undefined;

function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string | boolean | ((e: Event) => void)> = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === "function") node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) node.setAttribute(key, "");
    else if (value !== false) node.setAttribute(key, value);
  }
  for (const child of children) if (child) node.append(child);
  return node;
}

let counter = 0;

/** Pure DOM renderer shared by the live widget, the hosted WebView page and the dashboard preview. */
export class WidgetView {
  private host: HTMLElement;
  private root: ShadowRoot;
  private styleEl: HTMLStyleElement;
  private container: HTMLDivElement;
  private body!: HTMLDivElement;
  private panel!: HTMLDivElement;
  private state: ViewState;
  private previousFocus: Element | null = null;
  private previousOverflow = "";
  private media: MediaQueryList | null = null;
  private readonly id = `bb${++counter}`;

  constructor(private options: ViewOptions, initial: Partial<ViewState> = {}) {
    this.state = { step: "loading", reason: null, comment: "", offers: [], error: null, ...initial };
    this.host = document.createElement("boolbul-widget");
    if (options.inline) this.host.style.cssText = "position:absolute;inset:0;display:block;";
    this.root = this.host.attachShadow({ mode: "open" });
    this.styleEl = document.createElement("style");
    this.container = h("div", { class: "bb" });
    this.root.append(this.styleEl, this.container);
  }

  mount(): void {
    const target = this.options.inline ?? document.body;
    if (this.options.inline && getComputedStyle(this.options.inline).position === "static") {
      this.options.inline.style.position = "relative";
    }
    target.append(this.host);
    if (!this.options.inline) {
      this.previousFocus = document.activeElement;
      this.previousOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = "hidden";
      this.media = window.matchMedia("(max-width: 640px)");
      this.media.addEventListener?.("change", this.relayout);
    }
    this.render();
    if (!this.options.inline) queueMicrotask(() => this.focusFirst());
  }

  destroy(): void {
    this.media?.removeEventListener?.("change", this.relayout);
    this.host.remove();
    if (!this.options.inline) {
      document.documentElement.style.overflow = this.previousOverflow;
      if (this.previousFocus instanceof HTMLElement) this.previousFocus.focus();
    }
  }

  setState(next: Partial<ViewState>): void {
    const stepChanged = next.step !== undefined && next.step !== this.state.step;
    this.state = { ...this.state, ...next };
    this.renderBody();
    if (stepChanged) {
      this.body.scrollTop = 0;
      if (!this.options.inline) this.focusFirst();
    }
  }

  update(options: Partial<Pick<ViewOptions, "config" | "viewport" | "planPriceCents" | "currency">>): void {
    this.options = { ...this.options, ...options };
    this.render();
  }

  getState(): ViewState {
    return this.state;
  }

  private relayout = () => this.render();

  private layout(): "sheet" | "modal" {
    const narrow = this.options.viewport ? this.options.viewport === "mobile" : !!this.media?.matches;
    return this.options.config.mobileLayout === "sheet" && narrow ? "sheet" : "modal";
  }

  private render(): void {
    const { config } = this.options;
    this.styleEl.textContent = buildStyles(config);
    this.container.dataset.layout = this.layout();
    this.container.dataset.preset = config.themePreset;
    if (this.options.inline) this.container.dataset.inline = "";
    const titleId = `${this.id}-title`;
    this.body = h("div", { class: "bb-body" });
    const logo = config.logoUrl ? h("img", { class: "bb-logo", src: config.logoUrl, alt: "", referrerpolicy: "no-referrer" }) : null;
    this.panel = h("div", {
      class: "bb-panel", role: "dialog", "aria-modal": "true", "aria-labelledby": titleId,
      onKeydown: (event) => this.onKey(event as KeyboardEvent),
    },
    h("div", { class: "bb-handle", "aria-hidden": "true" }),
    h("div", { class: "bb-head" },
      logo ?? h("span", { class: "bb-eyebrow" }, "Manage subscription"),
      h("button", { class: "bb-close", type: "button", "aria-label": "Close and keep my subscription", onClick: () => this.options.onDismiss() }, "×")),
    this.body,
    this.footer());
    const overlay = h("div", { class: "bb-overlay", onClick: (event) => { if (event.target === overlay) this.options.onDismiss(); } }, this.panel);
    this.container.replaceChildren(overlay);
    this.renderBody();
  }

  private footer(): HTMLElement {
    const { config } = this.options;
    // The cancellation path is permanent, single-click and never disabled (FTC 16 CFR 425).
    return h("div", { class: "bb-foot" },
      h("button", {
        class: "bb-escape", type: "button", "data-boolbul-escape": true,
        onClick: () => this.options.onCancel(this.state.reason, this.state.comment),
      }, config.escapeHatchText),
      config.showBranding ? h("a", { class: "bb-brand", href: "https://boolbul.com/?ref=widget", target: "_blank", rel: "noopener" }, "Powered by BoolBul") : null);
  }

  private renderBody(): void {
    const { config } = this.options;
    const s = this.state;
    const titleId = `${this.id}-title`;
    const title = (text: string) => h("h2", { class: "bb-title", id: titleId }, text);
    let content: Child[] = [];

    if (s.step === "loading") {
      content = [h("span", { class: "bb-sr", id: titleId }, "Loading"), h("div", { class: "bb-skel", style: "width:70%;height:24px" }),
        h("div", { class: "bb-skel" }), h("div", { class: "bb-skel", style: "width:85%" }), h("div", { class: "bb-skel", style: "height:48px;margin-top:20px" }),
        h("div", { class: "bb-skel", style: "height:48px" })];
    } else if (s.step === "survey") {
      const list = h("div", { class: "bb-reasons", role: "radiogroup", "aria-labelledby": titleId });
      for (const reason of config.surveyReasons) {
        const checked = s.reason === reason.id;
        list.append(h("button", {
          class: "bb-reason", type: "button", role: "radio", "aria-checked": checked ? "true" : "false",
          onClick: () => { this.setState({ reason: reason.id }); this.options.onReasonChosen?.(reason.id); },
        }, h("span", { class: "bb-dot", "aria-hidden": "true" }), reason.label));
      }
      const comment = s.reason === "other" || s.reason === "missing_features"
        ? h("textarea", {
          class: "bb-comment", maxlength: "1000", "aria-label": "Tell us more (optional)",
          placeholder: s.reason === "other" ? "Tell us more (optional)" : "Which feature would keep you here? (optional)",
          onInput: (event) => { this.state.comment = (event.target as HTMLTextAreaElement).value; },
        }) : null;
      if (comment) (comment as HTMLTextAreaElement).value = s.comment;
      const hasOffers = selectOffers(s.offers, config.offerMode, s.reason).length > 0;
      content = [title(config.headline), h("p", { class: "bb-text" }, config.body), list, comment,
        h("button", { class: "bb-btn", type: "button", disabled: !s.reason, onClick: () => this.toOffers() },
          hasOffers ? "Continue" : "Send feedback & cancel")];
    } else if (s.step === "offers") {
      const offers = selectOffers(s.offers, config.offerMode, s.reason);
      const cards = h("div", { class: "bb-offers" });
      for (const offer of offers) {
        const copy = describeOffer(offer, this.options.planPriceCents, this.options.currency);
        cards.append(h("div", { class: "bb-offer" },
          h("span", { class: "bb-badge" }, copy.badge),
          h("h3", { class: "bb-offer-title" }, copy.title),
          h("p", { class: "bb-offer-detail" }, copy.detail),
          h("button", { class: "bb-btn", type: "button", onClick: () => this.options.onAccept(offer, s.reason) }, copy.cta)));
      }
      content = [
        title(config.surveyEnabled ? offerHeading(s.reason) : config.headline),
        h("p", { class: "bb-text" }, config.surveyEnabled ? "Pick one — it applies instantly. Or cancel below, no hard feelings." : config.body),
        s.error ? h("p", { class: "bb-error", role: "alert" }, s.error) : null,
        cards,
        config.surveyEnabled ? h("button", { class: "bb-back", type: "button", onClick: () => this.setState({ step: "survey", error: null }) }, "← Change my answer") : null,
      ];
    } else if (s.step === "processing") {
      content = [h("div", { class: "bb-center", role: "status" }, h("div", { class: "bb-spinner", "aria-hidden": "true" }),
        h("h2", { class: "bb-title", id: titleId }, "Applying your offer…"), h("p", { class: "bb-text" }, "This only takes a moment."))];
    } else if (s.step === "success") {
      content = [h("div", { class: "bb-center", role: "status" }, h("div", { class: "bb-icon", "aria-hidden": "true" }, "✓"),
        h("h2", { class: "bb-title", id: titleId }, "Done!"), h("p", { class: "bb-text" }, config.successText),
        h("button", { class: "bb-btn", type: "button", onClick: () => this.options.onDismiss() }, "Back to the app"))];
    } else {
      content = [title("Something went wrong"), h("p", { class: "bb-error", role: "alert" }, s.error ?? "Please try again."),
        h("button", { class: "bb-btn", type: "button", onClick: () => this.setState({ step: s.offers.length ? "offers" : "survey", error: null }) }, "Try again")];
    }
    this.body.replaceChildren(...content.filter((node): node is Node | string => !!node));
  }

  private toOffers(): void {
    const offers = selectOffers(this.state.offers, this.options.config.offerMode, this.state.reason);
    if (!offers.length) {
      // Survey-only: there is nothing to offer, so the reason is simply recorded with the cancellation.
      this.options.onCancel(this.state.reason, this.state.comment);
      return;
    }
    this.setState({ step: "offers", error: null });
  }

  private focusables(): HTMLElement[] {
    return Array.from(this.panel.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], textarea, [tabindex='0']"));
  }

  private focusFirst(): void {
    const items = this.focusables();
    (items.find((el) => !el.classList.contains("bb-close")) ?? items[0])?.focus({ preventScroll: true });
  }

  private onKey(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      this.options.onDismiss();
      return;
    }
    if (event.key !== "Tab" || this.options.inline) return;
    const items = this.focusables();
    if (!items.length) return;
    const active = this.root.activeElement;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && active === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
  }
}
