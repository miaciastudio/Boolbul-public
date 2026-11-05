export class InterceptError extends Error {
  constructor(
    readonly code: "invalid_request" | "tenant_unavailable" | "offer_unavailable" | "already_claimed" | "expired",
    readonly status: 400 | 403 | 409,
  ) {
    super(code);
    this.name = "InterceptError";
  }
}
