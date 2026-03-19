import neo4j, { type Driver, type Session, type Result } from "neo4j-driver";

let driver: Driver | null = null;

export function getDriver(): Driver {
  if (!driver) {
    const uri = process.env["NEO4J_URI"] ?? "bolt://localhost:7687";
    const user = process.env["NEO4J_USER"] ?? "neo4j";
    const password = process.env["NEO4J_PASSWORD"] ?? "meridian_dev";

    driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      maxConnectionPoolSize: 50,
      connectionAcquisitionTimeout: 10000,
    });
  }
  return driver;
}

export function getSession(mode: "READ" | "WRITE" = "WRITE"): Session {
  const d = getDriver();
  return d.session({
    defaultAccessMode: mode === "READ" ? neo4j.session.READ : neo4j.session.WRITE,
  });
}

export async function runQuery(
  cypher: string,
  params: Record<string, unknown> = {},
  mode: "READ" | "WRITE" = "READ",
): Promise<Result> {
  const session = getSession(mode);
  try {
    return await session.run(cypher, params);
  } finally {
    await session.close();
  }
}

export async function closeDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}
