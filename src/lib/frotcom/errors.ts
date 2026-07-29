export class FrotcomAdapterError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "FrotcomAdapterError";
    this.code = code;
  }
}

export class FrotcomNotConfiguredError extends FrotcomAdapterError {
  constructor() {
    super(
      "NOT_CONFIGURED",
      "Live Frotcom is not configured. PACK-001 uses mocks only until DS-001 is resolved.",
    );
    this.name = "FrotcomNotConfiguredError";
  }
}
