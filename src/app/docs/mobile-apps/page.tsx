import { C, Callout, Code, DocHeader, DocStep, Table } from "@/components/docs/DocBlocks";
import { flutterSnippet, reactNativeSnippet, swiftSnippet, webviewUrl } from "@/lib/docs/snippets";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  path: "/docs/mobile-apps",
  title: "Cancellation Flow for Mobile Apps — React Native, Flutter, iOS, Android",
  description: "Show BoolBul's cancellation flow inside native and hybrid mobile apps with a hosted WebView page and message bridge. Code for React Native, Flutter, Swift and Kotlin.",
});

export default function MobileDocsPage() {
  return (
    <div className="space-y-6">
      <DocHeader badge="MOBILE" title="Native & hybrid apps"
        intro={<>Open the hosted page in a WebView. The widget renders as a native-feeling bottom sheet and sends the outcome back to your app as a message; your backend applies offers exactly as on the web.</>} />

      <DocStep title="1. The hosted page">
        <Code>{webviewUrl()}</Code>
        <Table head={["Query param", "Required", "Notes"]} rows={[
          [<C key="a">customerId</C>, "yes", "Gateway customer id"],
          [<C key="b">subscriptionId</C>, "yes", "Subscription being cancelled"],
          [<C key="c">mrrCents</C>, "no", "For saved-MRR stats and price copy"],
          [<C key="d">currency</C>, "no", "ISO code, default USD"],
        ]} />
      </DocStep>

      <DocStep title="2. Messages your app receives">
        <Table head={["type", "payload", "Do this"]} rows={[
          [<C key="1">boolbul:offer_accepted</C>, <C key="1b">offer.offerJwt</C>, "POST it to your apply endpoint (same server code as web)."],
          [<C key="2">boolbul:cancel</C>, <C key="2b">details.reasonId, details.comment, details.failedOpen</C>, "Run your cancellation; forward the reason."],
          [<C key="3">boolbul:dismiss</C>, "—", "Close the WebView; the customer keeps their plan."],
        ]} />
        <p>Delivered through whichever bridge exists: React Native <C>ReactNativeWebView</C>, iOS <C>webkit.messageHandlers.boolbul</C>, Android / Flutter channel <C>BoolBulNative</C>, <C>flutter_inappwebview</C> handler <C>boolbul</C>, or <C>window.parent.postMessage</C> for iframes.</p>
      </DocStep>

      <DocStep title="React Native"><Code>{reactNativeSnippet()}</Code></DocStep>
      <DocStep title="Flutter (webview_flutter)"><Code>{flutterSnippet()}</Code></DocStep>
      <DocStep title="iOS (WKWebView)"><Code>{swiftSnippet()}</Code></DocStep>
      <DocStep title="Android (WebView)">
        <Code>{`webView.settings.javaScriptEnabled = true
webView.addJavascriptInterface(object {
  @JavascriptInterface fun postMessage(json: String) = handleBoolBul(json)
}, "BoolBulNative")
webView.loadUrl("${webviewUrl()}")`}</Code>
      </DocStep>

      <Callout tone="warn">App store rules: if your subscription is billed through Apple or Google in-app purchases, those stores own cancellation. BoolBul works with subscriptions billed by Dodo Payments or Stripe (web checkout), including ones used inside mobile apps.</Callout>
    </div>
  );
}
