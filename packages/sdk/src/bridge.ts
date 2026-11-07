import { open, type AcceptedOffer, type CancelDetails } from "./index";

export type BridgeMessage =
  | { type: "boolbul:offer_accepted"; offer: AcceptedOffer }
  | { type: "boolbul:cancel"; details: CancelDetails }
  | { type: "boolbul:dismiss" };

type NativeWindow = Window & {
  ReactNativeWebView?: { postMessage(message: string): void };
  webkit?: { messageHandlers?: { boolbul?: { postMessage(message: unknown): void } } };
  flutter_inappwebview?: { callHandler(name: string, ...args: unknown[]): Promise<unknown> };
  /** Android addJavascriptInterface / webview_flutter JavaScriptChannel named "BoolBulNative". */
  BoolBulNative?: { postMessage(message: string): void };
};

/** Delivers an event to whichever native shell hosts the page (React Native, iOS, Android, Flutter, iframe). */
export function postToNative(message: BridgeMessage): void {
  const w = window as NativeWindow;
  const json = JSON.stringify(message);
  if (w.ReactNativeWebView) w.ReactNativeWebView.postMessage(json);
  else if (w.webkit?.messageHandlers?.boolbul) w.webkit.messageHandlers.boolbul.postMessage(message);
  else if (w.BoolBulNative) w.BoolBulNative.postMessage(json);
  else if (w.flutter_inappwebview) void w.flutter_inappwebview.callHandler("boolbul", message);
  else if (window.parent !== window) window.parent.postMessage(message, "*");
}

/**
 * Hosted page mode (boolbul.com/w/<publicKey>?customerId=…&subscriptionId=…):
 * mobile apps open this URL in a WebView and receive the outcome as a message.
 * Offers are applied by the app's backend after it verifies `offerJwt`.
 */
export function startBridge(params: URLSearchParams = new URLSearchParams(location.search), publicKey?: string): void {
  const key = publicKey ?? params.get("publicKey") ?? "";
  const mrr = Number(params.get("mrrCents") ?? "0");
  void open({
    publicKey: key,
    customerId: params.get("customerId") ?? "",
    subscriptionId: params.get("subscriptionId") ?? "",
    mrrCents: Number.isSafeInteger(mrr) && mrr >= 0 ? mrr : 0,
    currency: params.get("currency") ?? undefined,
    apiBase: location.origin,
    // The native app applies the offer server-side; the widget shows success once the message is sent.
    onOfferAccepted: (offer) => postToNative({ type: "boolbul:offer_accepted", offer }),
    onCancel: (details) => postToNative({ type: "boolbul:cancel", details }),
    onDismiss: () => postToNative({ type: "boolbul:dismiss" }),
  });
}
