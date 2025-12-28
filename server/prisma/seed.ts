import { PrismaClient, Prisma } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toCamelCase(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

async function insertLocationData(locations: any[]): Promise<void> {
  for (const location of locations) {
    const { id, country, city, state, address, postalCode, coordinates } =
      location;
    try {
      // Parse coordinates string like "POINT(-73.935242 40.730610)" to PostGIS format
      await prisma.$executeRaw`
        INSERT INTO "Location" ("id", "country", "city", "state", "address", "postalCode", "coordinates") 
        VALUES (${id}, ${country}, ${city}, ${state}, ${address}, ${postalCode}, ST_GeomFromText(${coordinates}, 4326));
      `;
      console.log(`Inserted location for ${city}`);
    } catch (error) {
      console.error(`Error inserting location for ${city}:`, error);
    }
  }
}

async function resetSequence(modelName: string): Promise<void> {
  const quotedModelName = `"${modelName}"`;

  try {
    // Get max ID from the table
    const result = (await prisma.$queryRaw`
      SELECT MAX(id) as max_id FROM ${Prisma.raw(quotedModelName)};
    `) as any;

    const maxId = result[0]?.max_id || 0;
    const nextId = maxId + 1;

    await prisma.$executeRaw`
      SELECT setval(pg_get_serial_sequence(${quotedModelName}, 'id'), ${nextId}, false);
    `;

    console.log(`Reset sequence for ${modelName} to ${nextId}`);
  } catch (error) {
    console.error(`Error resetting sequence for ${modelName}:`, error);
  }
}

async function deleteAllData(orderedFileNames: string[]): Promise<void> {
  // Reverse order for deletion (respecting foreign key constraints)
  const modelNames = orderedFileNames
    .map((fileName) => {
      return toPascalCase(path.basename(fileName, path.extname(fileName)));
    })
    .reverse();

  for (const modelName of modelNames) {
    const modelNameCamel = toCamelCase(modelName);

    try {
      // Use Prisma's deleteMany with cascade if needed
      await (prisma as any)[modelNameCamel]?.deleteMany({});
      console.log(`Cleared data from ${modelName}`);
    } catch (error) {
      // If deleteMany fails due to foreign key constraints, try raw SQL
      try {
        await prisma.$executeRaw`DELETE FROM ${Prisma.raw(
          `"${modelName}"`
        )} CASCADE;`;
        console.log(`Cleared data from ${modelName} using CASCADE`);
      } catch (sqlError) {
        console.error(`Error clearing data from ${modelName}:`, sqlError);
      }
    }
  }
}

async function seedModel(modelName: string, data: any[]): Promise<void> {
  const modelNameCamel = toCamelCase(modelName);
  const model = (prisma as any)[modelNameCamel];

  if (!model) {
    console.error(`Model ${modelName} not found in Prisma client`);
    return;
  }

  try {
    // Remove fields with default values or that don't exist in schema
    let processedData = data;
    
    if (modelName === 'Property') {
      processedData = data.map(({ postedDate, ...rest }) => rest);
    } else if (modelName === 'Application') {
      processedData = data.map(({ name, email, phoneNumber, applicationDate, ...rest }) => rest);
    } else if (modelName === 'Payment') {
      processedData = data.map(({ lease, ...rest }) => ({
        ...rest,
        leaseId: lease?.connect?.id
      }));
    }

    // Tenant has relations, so we need to use individual creates
    // createMany doesn't support nested relations
    if (modelName === 'Tenant') {
      for (const item of processedData) {
        await model.create({
          data: item,
        });
      }
    } else if (model.createMany) {
      // Use createMany for better performance if possible
      await model.createMany({
        data: processedData,
        skipDuplicates: true,
      });
    } else {
      // Fallback to individual creates
      for (const item of processedData) {
        await model.create({
          data: item,
        });
      }
    }
    console.log(`Seeded ${modelName} with ${data.length} records`);
  } catch (error) {
    console.error(`Error seeding data for ${modelName}:`, error);
    throw error;
  }
}

async function main(): Promise<void> {
  const dataDirectory = path.join(__dirname, "seedData");

  const orderedFileNames = [
    "location.json", // No dependencies
    "manager.json", // No dependencies
    "property.json", // Depends on location and manager
    "tenant.json", // No dependencies
    "lease.json", // Depends on property and tenant
    "application.json", // Depends on property, tenant, and lease
    "payment.json", // Depends on lease
  ];

  try {
    console.log("Starting database seeding...");

    // Check if seedData directory exists
    if (!fs.existsSync(dataDirectory)) {
      console.error(`Seed data directory not found: ${dataDirectory}`);
      return;
    }

    // Delete all existing data
    console.log("Clearing existing data...");
    await deleteAllData(orderedFileNames);

    // Seed data in order
    for (const fileName of orderedFileNames) {
      const filePath = path.join(dataDirectory, fileName);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.warn(`Seed file not found: ${fileName}`);
        continue;
      }

      const modelName = toPascalCase(
        path.basename(fileName, path.extname(fileName))
      );

      console.log(`\nSeeding ${modelName} from ${fileName}...`);

      const jsonData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

      if (modelName === "Location") {
        await insertLocationData(jsonData);
      } else {
        await seedModel(modelName, jsonData);
      }

      // Reset sequence
      await resetSequence(modelName);

      // Small delay to avoid overwhelming the database
      await sleep(500);
    }

    console.log("\n✅ Database seeding completed successfully!");
  } catch (error) {
    console.error("\n❌ Error during database seeding:", error);
    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { main };
