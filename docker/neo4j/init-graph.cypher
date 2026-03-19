// ──────────────────────────────────────────────
// Project Meridian — Neo4j Graph Schema
// Node labels, relationships, constraints, indexes
// ──────────────────────────────────────────────

// NODE CONSTRAINTS (uniqueness)
CREATE CONSTRAINT lead_id IF NOT EXISTS FOR (l:Lead) REQUIRE l.id IS UNIQUE;
CREATE CONSTRAINT client_id IF NOT EXISTS FOR (c:Client) REQUIRE c.id IS UNIQUE;
CREATE CONSTRAINT person_id IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE;
CREATE CONSTRAINT org_id IF NOT EXISTS FOR (o:Organization) REQUIRE o.id IS UNIQUE;
CREATE CONSTRAINT school_id IF NOT EXISTS FOR (s:School) REQUIRE s.name IS UNIQUE;
CREATE CONSTRAINT club_id IF NOT EXISTS FOR (c:Club) REQUIRE c.name IS UNIQUE;
CREATE CONSTRAINT church_id IF NOT EXISTS FOR (ch:Church) REQUIRE ch.name IS UNIQUE;
CREATE CONSTRAINT board_id IF NOT EXISTS FOR (b:Board) REQUIRE b.name IS UNIQUE;
CREATE CONSTRAINT company_id IF NOT EXISTS FOR (co:Company) REQUIRE co.name IS UNIQUE;
CREATE CONSTRAINT household_id IF NOT EXISTS FOR (h:Household) REQUIRE h.id IS UNIQUE;
CREATE CONSTRAINT advisor_id IF NOT EXISTS FOR (a:Advisor) REQUIRE a.id IS UNIQUE;

// INDEXES for common lookups
CREATE INDEX lead_name IF NOT EXISTS FOR (l:Lead) ON (l.name);
CREATE INDEX lead_county IF NOT EXISTS FOR (l:Lead) ON (l.county);
CREATE INDEX person_name IF NOT EXISTS FOR (p:Person) ON (p.name);
CREATE INDEX org_name IF NOT EXISTS FOR (o:Organization) ON (o.name);
CREATE INDEX company_name IF NOT EXISTS FOR (co:Company) ON (co.name);

// RELATIONSHIP TYPES (documented as comments — Neo4j creates them on first use)
// Person → Person
//   :SPOUSE_OF
//   :PARENT_OF
//   :CHILD_OF
//   :SIBLING_OF
//   :COLLEAGUE_OF
//   :NEIGHBOR_OF
//
// Person → Organization
//   :WORKS_AT {title, since}
//   :FORMERLY_AT {title, from, to}
//   :BOARD_MEMBER_OF {since}
//   :VOLUNTEERS_AT {since}
//   :MEMBER_OF {since}
//
// Person → School
//   :ALUMNUS_OF {degree, year, major}
//
// Person → Company
//   :FOUNDED
//   :SOLD
//   :PARTNER_AT
//
// Lead → Client
//   :CONNECTED_VIA {relationship, mutual}
//
// Lead → Household
//   :MEMBER_OF
//
// Lead → Advisor
//   :ADVISED_BY {detected_date}
