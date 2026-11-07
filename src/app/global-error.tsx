"use client";

/** Last-resort boundary when the root layout itself fails. Must render its own <html>. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#2b4cff", fontFamily: "system-ui, sans-serif" }}>
        <div role="alert" style={{ background: "#fbf8ef", border: "4px solid #0a0a0a", boxShadow: "6px 6px 0 #0a0a0a", padding: 32, maxWidth: 420 }}>
          <h1 style={{ margin: "0 0 8px", textTransform: "uppercase" }}>BoolBul hit a snag</h1>
          <p style={{ margin: "0 0 16px" }}>Nothing was charged or cancelled. Please try again.</p>
          <button type="button" onClick={reset} style={{ background: "#ccff00", border: "3px solid #0a0a0a", padding: "8px 16px", fontWeight: 900, cursor: "pointer" }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
