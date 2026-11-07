"use client";
import { useEffect } from "react";
import { startBridge } from "@sdk/bridge";

export function HostedWidget({ publicKey }: { publicKey: string }) {
  useEffect(() => {
    startBridge(new URLSearchParams(window.location.search), publicKey);
  }, [publicKey]);
  return null;
}
