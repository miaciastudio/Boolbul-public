"use client";
import { useCallback, useEffect, useRef, type CSSProperties } from "react";
import { open, preview, type OpenOptions, type PreviewHandle, type PreviewOptions } from "./index";

/** `const openRetention = useBoolBul(); <button onClick={() => openRetention({...})}>Cancel</button>` */
export function useBoolBul(defaults: Partial<OpenOptions> = {}) {
  const ref = useRef(defaults);
  ref.current = defaults;
  return useCallback((options: Partial<OpenOptions>) => open({ ...ref.current, ...options } as OpenOptions), []);
}

export interface BoolBulPreviewProps extends PreviewOptions {
  className?: string;
  style?: CSSProperties;
}

/** Live, network-free preview of the exact widget your customers see. */
export function BoolBulPreview({ className, style, ...options }: BoolBulPreviewProps) {
  const target = useRef<HTMLDivElement>(null);
  const handle = useRef<PreviewHandle | null>(null);
  const latest = useRef(options);
  latest.current = options;

  useEffect(() => {
    if (!target.current) return;
    handle.current = preview(target.current, latest.current);
    return () => { handle.current?.destroy(); handle.current = null; };
  }, []);

  const key = JSON.stringify([options.config, options.viewport, options.planPriceCents, options.currency, options.offers, options.step]);
  useEffect(() => { handle.current?.update(latest.current); }, [key]);

  return <div ref={target} className={className} style={{ position: "relative", overflow: "hidden", ...style }} />;
}
