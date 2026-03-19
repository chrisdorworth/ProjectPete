export interface SuppressionContext {
  email: string | null;
  phone: string | null;
  leadId: string;
}

export type SuppressionTrigger =
  | { type: "bounce"; bounceType: "hard" | "soft"; email: string }
  | { type: "unsubscribe"; channel: string }
  | { type: "deceased" }
  | { type: "complaint"; source: string }
  | { type: "dnc_list"; listType: "federal" | "state"; state?: string }
  | { type: "manual"; reason: string; suppressedBy: string }
  | { type: "ccpa_request" }
  | { type: "gdpr_request" };

export interface SuppressionAction {
  shouldSuppress: boolean;
  permanent: boolean;
  reason: string;
  suppressFields: ("email" | "phone" | "all")[];
}

export function evaluateSuppression(trigger: SuppressionTrigger): SuppressionAction {
  switch (trigger.type) {
    case "bounce":
      if (trigger.bounceType === "hard") {
        return {
          shouldSuppress: true,
          permanent: true,
          reason: `Hard bounce on ${trigger.email}`,
          suppressFields: ["email"],
        };
      }
      return {
        shouldSuppress: false,
        permanent: false,
        reason: "Soft bounce — retry later",
        suppressFields: [],
      };

    case "unsubscribe":
      return {
        shouldSuppress: true,
        permanent: true,
        reason: `Unsubscribed from ${trigger.channel}`,
        suppressFields: ["all"],
      };

    case "deceased":
      return {
        shouldSuppress: true,
        permanent: true,
        reason: "Deceased — permanent suppression",
        suppressFields: ["all"],
      };

    case "complaint":
      return {
        shouldSuppress: true,
        permanent: true,
        reason: `Complaint received from ${trigger.source}`,
        suppressFields: ["all"],
      };

    case "dnc_list":
      return {
        shouldSuppress: true,
        permanent: true,
        reason: `On ${trigger.listType} DNC list${trigger.state ? ` (${trigger.state})` : ""}`,
        suppressFields: ["phone"],
      };

    case "manual":
      return {
        shouldSuppress: true,
        permanent: false,
        reason: `Manual: ${trigger.reason} by ${trigger.suppressedBy}`,
        suppressFields: ["all"],
      };

    case "ccpa_request":
      return {
        shouldSuppress: true,
        permanent: true,
        reason: "CCPA do-not-sell/delete request",
        suppressFields: ["all"],
      };

    case "gdpr_request":
      return {
        shouldSuppress: true,
        permanent: true,
        reason: "GDPR right-to-erasure request",
        suppressFields: ["all"],
      };
  }
}
