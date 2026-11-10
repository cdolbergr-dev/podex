export class TcgRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "TcgRequestError";
    this.status = status;
  }
}

export function catalogErrorMessage(error: unknown): string {
  if (error instanceof TcgRequestError) return error.message;
  return "The card catalog could not be reached. Try again in a moment.";
}
