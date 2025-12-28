"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const prisma = new client_1.PrismaClient();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toPascalCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toCamelCase(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

async function insertLocationData(locations) {
  for (const location of locations) {
    const { id, country, city, state, address, postalCode, coordinates } =
      location;
    try {
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

async function resetSequence(modelName) {
  const quotedModelName = `"${modelName}"`;
  try {
    // Get max ID using raw query
    const result =
      await prisma.$queryRaw`SELECT MAX(id) as max_id FROM ${client_1.Prisma.raw(
        quotedModelName
      )}`;
    const maxId = result[0]?.max_id || 0;
    const nextId = maxId + 1;

    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence(${quotedModelName}, 'id'), ${nextId}, false)`;
    console.log(`Reset sequence for ${modelName} to ${nextId}`);
  } catch (error) {
    console.error(`Error resetting sequence for ${modelName}:`, error);
  }
}

async function deleteAllData(orderedFileNames) {
  const modelNames = orderedFileNames.map((fileName) => {
    return toPascalCase(
      path_1.default.basename(fileName, path_1.default.extname(fileName))
    );
  });

  // Reverse for deletion (respect foreign key constraints)
  for (const modelName of modelNames.reverse()) {
    const modelNameCamel = toCamelCase(modelName);

    try {
      // Try raw SQL with CASCADE first
      await prisma.$executeRaw`DELETE FROM ${client_1.Prisma.raw(
        `"${modelName}"`
      )} CASCADE`;
      console.log(`Cleared data from ${modelName} using CASCADE`);
    } catch (error) {
      console.error(`Error clearing data from ${modelName}:`, error);
    }
  }
}

async function main() {
  const dataDirectory = path_1.default.join(__dirname, "seedData");
  const orderedFileNames = [
    "location.json", // No dependencies
    "manager.json", // No dependencies
    "property.json", // Depends on location and manager
    "tenant.json", // No dependencies
    "application.json", // Depends on property and tenant
    "lease.json", // Depends on property and tenant
    "payment.json", // Depends on lease
  ];

  try {
    console.log("Starting database seeding...");

    // Check if seedData directory exists
    if (!fs_1.default.existsSync(dataDirectory)) {
      console.error(`Seed data directory not found: ${dataDirectory}`);
      return;
    }

    // Delete all existing data
    await deleteAllData(orderedFileNames);

    // Seed data in correct order
    for (const fileName of orderedFileNames) {
      const filePath = path_1.default.join(dataDirectory, fileName);

      // Check if file exists
      if (!fs_1.default.existsSync(filePath)) {
        console.warn(`Seed file not found: ${fileName}`);
        continue;
      }

      const modelName = toPascalCase(
        path_1.default.basename(fileName, path_1.default.extname(fileName))
      );
      const modelNameCamel = toCamelCase(modelName);

      console.log(`\nSeeding ${modelName} from ${fileName}...`);

      const jsonData = JSON.parse(fs_1.default.readFileSync(filePath, "utf-8"));

      if (modelName === "Location") {
        await insertLocationData(jsonData);
      } else {
        const model = prisma[modelNameCamel];

        if (!model || !model.create) {
          console.error(
            `Model ${modelName} not found or doesn't have create method`
          );
          continue;
        }

        try {
          // Use createMany if available for better performance
          if (model.createMany) {
            await model.createMany({
              data: jsonData,
              skipDuplicates: true,
            });
          } else {
            // Fallback to individual creates
            for (const item of jsonData) {
              await model.create({
                data: item,
              });
            }
          }
          console.log(`Seeded ${modelName} with ${jsonData.length} records`);
        } catch (error) {
          console.error(`Error seeding data for ${modelName}:`, error);
        }
      }

      // Reset the sequence after seeding each model
      await resetSequence(modelName);
      await sleep(500); // Smaller delay
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
