// Prisma configuration for Migrate (Prisma v7+)
// See https://pris.ly/d/config-datasource

export default {
  datasource: {
    url: process.env.DATABASE_URL as string,
  },
};
