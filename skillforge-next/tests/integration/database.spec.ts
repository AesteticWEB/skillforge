import { describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";

const shouldRun =
  process.env.CI === "true" || process.env.RUN_DB_INTEGRATION === "true";
const describeIntegration = shouldRun ? describe : describe.skip;

describeIntegration("database integration", () => {
  it("finds seeded admin user", async () => {
    const prisma = new PrismaClient();
    const admin = await prisma.user.findUnique({ where: { login: "admin1" } });
    await prisma.$disconnect();
    expect(admin?.login).toBe("admin1");
    expect(admin?.role).toBe("admin");
  });
});
