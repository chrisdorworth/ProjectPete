import type { OutreachProvider, SendResult, DeliveryStatus } from "../../types.js";

export class BondProvider implements OutreachProvider {
  name = "bond";
  channel = "handwritten";

  private apiKey: string;
  private baseUrl = "https://api.bond.co/v1";

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env["BOND_API_KEY"] ?? "";
  }

  async send(params: {
    recipientAddress?: { name: string; street: string; city: string; state: string; zip: string } | null;
    body: string;
    fromName: string;
    metadata: Record<string, string>;
  }): Promise<SendResult> {
    if (!params.recipientAddress) {
      return { success: false, externalId: null, error: "No recipient address for handwritten note" };
    }

    const returnAddress = {
      name: params.fromName,
      address_line_1: process.env["FIRM_ADDRESS_LINE1"] ?? "",
      city: process.env["FIRM_CITY"] ?? "",
      state: process.env["FIRM_STATE"] ?? "",
      zip: process.env["FIRM_ZIP"] ?? "",
    };

    const response = await fetch(`${this.baseUrl}/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template_id: process.env["BOND_TEMPLATE_ID"] ?? "default",
        recipient: {
          name: params.recipientAddress.name,
          address_line_1: params.recipientAddress.street,
          city: params.recipientAddress.city,
          state: params.recipientAddress.state,
          zip: params.recipientAddress.zip,
        },
        return_address: returnAddress,
        message: params.body,
        handwriting_style: "neat_cursive",
        paper_type: "premium_cream",
        envelope_type: "handwritten_address",
        metadata: params.metadata,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { success: false, externalId: null, error: `Bond error: ${response.status} ${err}` };
    }

    const data = await response.json() as { id: string; cost_cents: number };
    return { success: true, externalId: data.id, error: null, costCents: data.cost_cents ?? 350 };
  }

  async checkStatus(externalId: string): Promise<DeliveryStatus> {
    const response = await fetch(`${this.baseUrl}/orders/${externalId}`, {
      headers: { "Authorization": `Bearer ${this.apiKey}` },
    });

    if (!response.ok) return { status: "unknown" };

    const data = await response.json() as { status: string };
    const statusMap: Record<string, DeliveryStatus["status"]> = {
      pending: "sent",
      in_production: "sent",
      mailed: "delivered",
      delivered: "delivered",
      returned: "bounced",
    };

    return { status: statusMap[data.status] ?? "unknown" };
  }
}
