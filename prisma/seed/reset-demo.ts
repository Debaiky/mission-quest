/** Removes the demo family and everything under it, then recreates it. `npm run db:reset-demo` */
import "dotenv/config";
import { prisma } from "@/lib/db/prisma";
import { DEMO, seedDemoFamily } from "./demo";

async function main() {
  const family = await prisma.family.findUnique({ where: { code: DEMO.familyCode } });
  if (family) {
    await prisma.$transaction(async (tx) => {
      // Instances restrict task deletion, so remove them before the cascade takes the rest.
      await tx.taskInstance.deleteMany({ where: { familyId: family.id } });
      await tx.rewardRedemption.deleteMany({ where: { child: { familyId: family.id } } });
      await tx.task.deleteMany({ where: { familyId: family.id } });
      await tx.family.delete({ where: { id: family.id } });
    });
    console.log(`Removed demo family ${DEMO.familyCode}.`);
  }
  if (process.argv.includes("--remove-only")) return;
  await seedDemoFamily();
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
