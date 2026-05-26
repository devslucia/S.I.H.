import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const userCount = await prisma.usuario.count();
  console.log("Total usuarios en DB:", userCount);

  const user = await prisma.usuario.findUnique({
    where: { email: "admin@simes.com.ar" },
  });

  if (user) {
    console.log("Usuario admin encontrado:");
    console.log("  id:", user.id);
    console.log("  email:", user.email);
    console.log("  nombre:", user.nombre);
    console.log("  rol:", user.rol);
    console.log("  password (primeros 20 chars):", user.password?.substring(0, 20));
    const match = await bcrypt.compare("Admin1234", user.password);
    console.log("bcrypt.compare('Admin1234', hash):", match);
  } else {
    console.log("admin@simes.com.ar NO ENCONTRADO");
    const all = await prisma.usuario.findMany({ select: { email: true, nombre: true } });
    console.log("Usuarios en DB:", JSON.stringify(all));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
