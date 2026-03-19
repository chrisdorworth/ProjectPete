import { runQuery } from "./client.js";
import type { StoredEvent } from "@meridian/event-store";

export async function syncEventToGraph(event: StoredEvent): Promise<void> {
  const p = event.payload as Record<string, unknown>;

  switch (event.eventType) {
    case "LeadCreated":
      await runQuery(
        `MERGE (l:Lead {id: $id})
         SET l.name = $name, l.company = $company, l.title = $title,
             l.county = $county, l.state = $state, l.createdAt = datetime($createdAt)`,
        {
          id: p["leadId"],
          name: p["fullName"] ?? `${p["firstName"] ?? ""} ${p["lastName"] ?? ""}`.trim(),
          company: p["company"],
          title: p["title"],
          county: p["county"],
          state: p["state"],
          createdAt: event.createdAt.toISOString(),
        },
        "WRITE",
      );

      if (p["company"]) {
        await runQuery(
          `MERGE (co:Company {name: $company})
           WITH co
           MATCH (l:Lead {id: $leadId})
           MERGE (l)-[:WORKS_AT {title: $title}]->(co)`,
          { company: p["company"], leadId: p["leadId"], title: p["title"] ?? "" },
          "WRITE",
        );
      }
      break;

    case "HouseholdFormed":
      await runQuery(
        `MERGE (h:Household {id: $id})
         SET h.address = $address, h.county = $county
         WITH h
         UNWIND $memberIds AS memberId
         MATCH (l:Lead {id: memberId})
         MERGE (l)-[:MEMBER_OF]->(h)`,
        {
          id: p["householdId"],
          address: p["address"],
          county: p["county"],
          memberIds: p["memberLeadIds"],
        },
        "WRITE",
      );
      break;

    case "HouseholdMemberAdded":
      await runQuery(
        `MATCH (h:Household {id: $householdId})
         MATCH (l:Lead {id: $leadId})
         MERGE (l)-[:MEMBER_OF]->(h)`,
        { householdId: p["householdId"], leadId: p["leadId"] },
        "WRITE",
      );
      break;

    case "EnrichmentMerged":
      // Update lead node with enrichment data
      await runQuery(
        `MATCH (l:Lead {id: $leadId})
         SET l.enriched = true`,
        { leadId: p["leadId"] },
        "WRITE",
      );
      break;

    case "WarmPathFound": {
      const paths = p["paths"] as Array<{
        clientId: string;
        clientName: string;
        relationship: string;
        mutual: string | null;
      }>;
      for (const path of paths) {
        await runQuery(
          `MATCH (l:Lead {id: $leadId})
           MERGE (c:Client {id: $clientId})
           SET c.name = $clientName
           MERGE (l)-[:CONNECTED_VIA {relationship: $relationship, mutual: $mutual}]->(c)`,
          {
            leadId: p["leadId"],
            clientId: path.clientId,
            clientName: path.clientName,
            relationship: path.relationship,
            mutual: path.mutual,
          },
          "WRITE",
        );
      }
      break;
    }

    case "CompetitorDetected":
      if (p["advisorName"] || p["firmName"]) {
        await runQuery(
          `MATCH (l:Lead {id: $leadId})
           MERGE (a:Advisor {id: coalesce($firmName, $advisorName)})
           SET a.name = coalesce($advisorName, $firmName), a.firm = $firmName
           MERGE (l)-[:ADVISED_BY {detected_date: datetime($date)}]->(a)`,
          {
            leadId: p["leadId"],
            advisorName: p["advisorName"],
            firmName: p["firmName"],
            date: event.createdAt.toISOString(),
          },
          "WRITE",
        );
      }
      break;

    case "LeadConverted":
      await runQuery(
        `MATCH (l:Lead {id: $leadId})
         REMOVE l:Lead
         SET l:Client, l.convertedAt = datetime($date)`,
        { leadId: p["leadId"], date: event.createdAt.toISOString() },
        "WRITE",
      );
      break;
  }
}
