import BoolBul from "./index";
import { startBridge } from "./bridge";

declare global {
  interface Window { BoolBul?: typeof BoolBul & { startBridge: typeof startBridge } }
}

// <script src="https://boolbul.com/v1/boolbul.js"></script> exposes window.BoolBul.
window.BoolBul = { ...BoolBul, startBridge };
