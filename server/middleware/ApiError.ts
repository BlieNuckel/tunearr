type ApiErrorOptions = {
  /** The request can succeed if repeated later; the client may retry it on its own. */
  retryable?: boolean;
  /** How long the client should wait before retrying. */
  retryAfterMs?: number;
};

export class ApiError extends Error {
  public retryable?: boolean;
  public retryAfterMs?: number;

  constructor(
    public status: number,
    message: string,
    options: ApiErrorOptions = {}
  ) {
    super(message);
    this.retryable = options.retryable;
    this.retryAfterMs = options.retryAfterMs;
  }
}
