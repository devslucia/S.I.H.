-- AlterForeignKey: Change Cirugia.quirofanoId from ON DELETE SET NULL to ON DELETE RESTRICT
ALTER TABLE "Cirugia" DROP CONSTRAINT "Cirugia_quirofanoId_fkey",
    ADD CONSTRAINT "Cirugia_quirofanoId_fkey" FOREIGN KEY ("quirofanoId") REFERENCES "Quirofano"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
