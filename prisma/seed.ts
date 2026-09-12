import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.createMany({
    data: [
      { name: "Admin", email: "admin@example.com", role: UserRole.admin },
      { name: "Editor", email: "editor@example.com", role: UserRole.editor },
      { name: "Viewer", email: "viewer@example.com", role: UserRole.viewer },
    ],
    skipDuplicates: true,
  });
}

main().finally(() => prisma.$disconnect());
