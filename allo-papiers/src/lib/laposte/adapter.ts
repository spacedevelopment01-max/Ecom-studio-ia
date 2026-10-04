import "server-only";

export type PostalAddress = {
  name: string;
  line1: string;
  line2?: string;
  postalCode: string;
  city: string;
  country: "FR";
};

export type Submission = {
  sendId: string;
  idempotencyKey: string;
  service: "lrar";
  sender: PostalAddress;
  recipient: PostalAddress;
  /** PDF final (courrier + pièces jointes), exactement celui qui a été validé. */
  pdf: Buffer;
};

export type SubmissionResult = {
  providerReference: string;
  trackingNumber: string;
  fictive: boolean;
  events: { status: string; detail: string }[];
};

export interface PostalAdapter {
  readonly mode: "test" | "real";
  readonly label: string;
  submit(s: Submission): Promise<SubmissionResult>;
}

export class PostalNotAvailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PostalNotAvailableError";
  }
}
