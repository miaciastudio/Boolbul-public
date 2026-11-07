import { readableOn, THEMES, type WidgetConfig } from "./config";

/** Scoped stylesheet for the widget's Shadow DOM. Host-page CSS can't leak in or out. */
export function buildStyles(config: WidgetConfig): string {
  const t = THEMES[config.themePreset];
  const r = config.borderRadius;
  const brutal = config.themePreset === "neo_brutalist";
  const font = config.fontFamily ? `'${config.fontFamily.replace(/'/g, "")}', ${t.font}` : t.font;
  return `
:host{all:initial}
*,*::before,*::after{box-sizing:border-box}
.bb{--bg:${t.bg};--surface:${t.surface};--text:${t.text};--muted:${t.muted};--border:${t.border};
--bw:${t.borderWidth}px;--r:${r}px;--rs:${Math.max(0, Math.round(r * 0.6))}px;--accent:${config.accentColor};
--on-accent:${readableOn(config.accentColor)};--shadow:${t.shadow};--card-shadow:${t.cardShadow};
font-family:${font};color:var(--text);-webkit-font-smoothing:antialiased;line-height:1.45;font-size:15px}
.bb-overlay{position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;
padding:16px;background:${t.overlay};animation:bb-fade .18s ease-out}
.bb[data-inline] .bb-overlay{position:absolute}
.bb-panel{position:relative;display:flex;flex-direction:column;width:100%;max-width:440px;max-height:min(720px,calc(100% - 8px));
background:var(--bg);color:var(--text);border:var(--bw) solid var(--border);border-radius:var(--r);box-shadow:var(--shadow);
overflow:hidden;animation:bb-pop .22s cubic-bezier(.2,.9,.3,1.2)}
.bb[data-layout=sheet] .bb-overlay{align-items:flex-end;padding:0}
.bb[data-layout=sheet] .bb-panel{max-width:none;max-height:92%;border-radius:calc(var(--r) + 12px) calc(var(--r) + 12px) 0 0;
border-bottom-width:0;animation:bb-up .26s cubic-bezier(.2,.9,.3,1)}
.bb-handle{display:none;width:44px;height:5px;border-radius:99px;background:var(--muted);opacity:.35;margin:10px auto 0;flex:none}
.bb[data-layout=sheet] .bb-handle{display:block}
.bb-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px 0;flex:none}
.bb-logo{height:28px;max-width:140px;object-fit:contain}
.bb-eyebrow{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.bb-close{appearance:none;border:0;background:transparent;color:var(--muted);width:40px;height:40px;margin:-8px -10px -8px 0;
border-radius:999px;font-size:22px;line-height:1;cursor:pointer;display:grid;place-items:center}
.bb-close:hover{color:var(--text);background:color-mix(in srgb,var(--text) 8%,transparent)}
.bb-body{padding:8px 20px 20px;overflow-y:auto;overscroll-behavior:contain;flex:1 1 auto;scrollbar-width:thin;scrollbar-color:color-mix(in srgb,var(--text) 25%,transparent) transparent}
.bb-title{margin:6px 0 6px;font-size:24px;line-height:1.15;font-weight:800;letter-spacing:-.02em;${brutal ? "text-transform:uppercase;" : ""}}
.bb-text{margin:0 0 16px;color:var(--muted);font-size:15px}
.bb-reasons{display:grid;gap:8px;margin:0 0 14px;padding:0;border:0}
.bb-reason{display:flex;align-items:center;gap:12px;width:100%;min-height:48px;padding:12px 14px;text-align:left;font:inherit;
font-weight:600;color:var(--text);background:var(--surface);border:var(--bw) solid var(--border);border-radius:var(--rs);
cursor:pointer;transition:transform .12s,box-shadow .12s,background .12s}
.bb-reason:hover{transform:translateY(-1px)}
.bb-reason[aria-checked=true]{background:color-mix(in srgb,var(--accent) 22%,var(--surface));border-color:${brutal ? "var(--border)" : "var(--accent)"};
box-shadow:${brutal ? "3px 3px 0 var(--border)" : "0 0 0 3px color-mix(in srgb,var(--accent) 30%,transparent)"}}
.bb-dot{flex:none;width:18px;height:18px;border-radius:999px;border:2px solid var(--border);display:grid;place-items:center}
.bb-reason[aria-checked=true] .bb-dot::after{content:"";width:8px;height:8px;border-radius:999px;background:var(--text)}
.bb-comment{width:100%;min-height:76px;margin:0 0 14px;padding:12px 14px;font:inherit;color:var(--text);background:var(--surface);
border:var(--bw) solid var(--border);border-radius:var(--rs);resize:vertical}
.bb-btn{appearance:none;display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:50px;padding:12px 18px;
font:inherit;font-size:16px;font-weight:800;color:var(--on-accent);background:var(--accent);border:var(--bw) solid ${brutal ? "var(--border)" : "var(--accent)"};
border-radius:var(--rs);cursor:pointer;box-shadow:${brutal ? "4px 4px 0 var(--border)" : "none"};transition:transform .12s,box-shadow .12s,filter .12s}
.bb-btn:hover{${brutal ? "transform:translate(-1px,-1px);box-shadow:5px 5px 0 var(--border)" : "filter:brightness(1.05)"}}
.bb-btn:active{${brutal ? "transform:translate(2px,2px);box-shadow:1px 1px 0 var(--border)" : "transform:scale(.99)"}}
.bb-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
.bb-offers{display:grid;gap:12px}
.bb-offer{padding:16px;background:var(--surface);border:var(--bw) solid var(--border);border-radius:var(--r);box-shadow:var(--card-shadow)}
.bb-offer:first-child{border-color:${brutal ? "var(--border)" : "var(--accent)"};${brutal ? "background:color-mix(in srgb,var(--accent) 18%,var(--surface));" : ""}}
.bb-badge{display:inline-block;margin-bottom:8px;padding:3px 8px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;
color:var(--on-accent);background:var(--accent);border-radius:${brutal ? "0" : "999px"};${brutal ? "border:2px solid var(--border);" : ""}}
.bb-offer-title{margin:0 0 4px;font-size:19px;font-weight:800;letter-spacing:-.01em}
.bb-offer-detail{margin:0 0 14px;color:var(--muted);font-size:14px}
.bb-back{appearance:none;border:0;background:none;padding:10px 0 0;font:inherit;font-size:14px;font-weight:600;color:var(--muted);cursor:pointer}
.bb-foot{flex:none;padding:12px 20px calc(14px + env(safe-area-inset-bottom,0px));border-top:var(--bw) solid var(--border);background:var(--bg);
display:flex;flex-direction:column;align-items:center;gap:6px}
.bb-escape{appearance:none;width:100%;min-height:46px;padding:10px 12px;font:inherit;font-size:15px;font-weight:700;color:var(--text);
background:transparent;border:0;text-decoration:underline;text-underline-offset:4px;text-decoration-thickness:2px;cursor:pointer;
opacity:1!important;visibility:visible!important}
.bb-escape:hover{background:color-mix(in srgb,var(--text) 6%,transparent);border-radius:var(--rs)}
.bb-brand{font-size:11px;color:var(--muted);text-decoration:none;opacity:.85}
.bb-brand:hover{text-decoration:underline}
.bb-center{text-align:center;padding:12px 0 4px}
.bb-icon{width:64px;height:64px;margin:0 auto 14px;display:grid;place-items:center;border-radius:999px;background:var(--accent);
color:var(--on-accent);font-size:30px;font-weight:900;${brutal ? "border:3px solid var(--border);box-shadow:4px 4px 0 var(--border);" : ""}}
.bb-spinner{width:36px;height:36px;margin:24px auto 12px;border-radius:999px;border:4px solid color-mix(in srgb,var(--text) 15%,transparent);
border-top-color:var(--accent);animation:bb-spin .8s linear infinite}
.bb-skel{height:14px;margin:10px 0;border-radius:6px;background:linear-gradient(90deg,color-mix(in srgb,var(--text) 8%,transparent),
color-mix(in srgb,var(--text) 16%,transparent),color-mix(in srgb,var(--text) 8%,transparent));background-size:200% 100%;animation:bb-shimmer 1.2s infinite}
.bb-error{margin:0 0 12px;padding:10px 12px;font-size:14px;font-weight:600;color:var(--text);border:var(--bw) solid var(--border);
border-left:5px solid #E11D48;border-radius:var(--rs);background:var(--surface)}
.bb :focus-visible{outline:3px solid var(--accent);outline-offset:2px}
.bb[data-preset=high_contrast] :focus-visible,.bb[data-preset=minimal_slate] :focus-visible{outline-color:var(--text)}
.bb-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@keyframes bb-fade{from{opacity:0}}
@keyframes bb-pop{from{opacity:0;transform:translateY(8px) scale(.97)}}
@keyframes bb-up{from{transform:translateY(100%)}}
@keyframes bb-spin{to{transform:rotate(360deg)}}
@keyframes bb-shimmer{to{background-position:-200% 0}}
@media (prefers-reduced-motion:reduce){.bb *{animation:none!important;transition:none!important}}
`;
}
