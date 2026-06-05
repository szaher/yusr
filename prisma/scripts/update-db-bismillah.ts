import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import data from "../data/quran-ayah-text.json";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter });

  let updated = 0;
  for (let s = 2; s <= 114; s++) {
    if (s === 9) continue;
    const entry = (data as { surahNumber: number; ayahNumber: number; textAr: string }[]).find(
      (d) => d.surahNumber === s && d.ayahNumber === 1
    );
    if (!entry) continue;

    await db.quranAyah.updateMany({
      where: { surahNumber: s, ayahNumber: 1 },
      data: { textAr: entry.textAr },
    });
    updated++;
  }

  console.log(`Updated ${updated} ayah records in DB`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
