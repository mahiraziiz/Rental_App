import { Request, Response } from "express";
import { wktToGeoJSON } from "@terraformer/wkt";
import prisma from "../db";

// Helper to get string from params
const getParamString = (
  param: string | string[] | undefined,
): string | undefined => {
  if (typeof param === "string") return param;
  if (Array.isArray(param) && param.length > 0) return param[0];
  return undefined;
};

// Get tenant by ID
const getTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = getParamString(id);

    if (!userId) {
      res.status(400).json({ message: "Invalid user ID" });
      return;
    }

    const tenant = await prisma.tenant.findUnique({
      where: {
        userId: userId,
      },
      include: {
        favorites: true,
        properties: true,
        applications: true,
        leases: true,
      },
    });

    if (tenant) {
      res.json(tenant);
    } else {
      res.status(404).json({ message: "Tenant not found" });
    }
  } catch (error: any) {
    res.status(500).json({
      message: `Error retrieving tenant: ${error.message}`,
    });
  }
};

// Create tenant
const createTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, name, email, phoneNumber } = req.body;

    if (!userId) {
      res.status(400).json({ message: "userId is required" });
      return;
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const tenant = await prisma.tenant.create({
      data: {
        userId,
        name,
        email,
        phoneNumber,
      },
    });

    res.status(201).json(tenant);
  } catch (error: any) {
    res.status(500).json({
      message: `Error creating tenant: ${error.message}`,
    });
  }
};

// Update tenant
const updateTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = getParamString(id);

    if (!userId) {
      res.status(400).json({ message: "Invalid user ID" });
      return;
    }

    const { name, email, phoneNumber } = req.body;

    const updatedTenant = await prisma.tenant.update({
      where: {
        userId: userId,
      },
      data: {
        name,
        email,
        phoneNumber,
      },
    });

    res.json(updatedTenant);
  } catch (error: any) {
    res.status(500).json({
      message: `Error updating tenant: ${error.message}`,
    });
  }
};

// Delete tenant
const deleteTenant = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = getParamString(id);

    if (!userId) {
      res.status(400).json({ message: "Invalid user ID" });
      return;
    }

    // Get tenant with relations
    const tenant = await prisma.tenant.findUnique({
      where: { userId: userId },
      include: {
        favorites: { select: { id: true } },
        properties: { select: { id: true } },
      },
    });

    if (!tenant) {
      res.status(404).json({ message: "Tenant not found" });
      return;
    }

    // Delete tenant
    await prisma.$transaction(async (tx) => {
      // Remove tenant from favorites and properties first
      if (tenant.favorites && tenant.favorites.length > 0) {
        await tx.tenant.update({
          where: { userId: userId },
          data: {
            favorites: {
              disconnect: tenant.favorites.map((property) => ({
                id: property.id,
              })),
            },
          },
        });
      }

      if (tenant.properties && tenant.properties.length > 0) {
        await tx.tenant.update({
          where: { userId: userId },
          data: {
            properties: {
              disconnect: tenant.properties.map((property) => ({
                id: property.id,
              })),
            },
          },
        });
      }

      // Delete tenant
      await tx.tenant.delete({
        where: { userId: userId },
      });

      // Delete user
      await tx.user.delete({
        where: { id: userId },
      });
    });

    res.json({ message: "Tenant account deleted successfully" });
  } catch (error: any) {
    res.status(500).json({
      message: `Error deleting tenant: ${error.message}`,
    });
  }
};

// Get tenant's current residences
const getCurrentResidences = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = getParamString(id);

    if (!userId) {
      res.status(400).json({ message: "Invalid user ID" });
      return;
    }

    const properties = await prisma.property.findMany({
      where: {
        tenants: {
          some: { userId: userId },
        },
      },
      include: {
        location: true,
      },
    });

    const propertiesWithFormattedLocation = await Promise.all(
      properties.map(async (property) => {
        const coordinates: { coordinates: string }[] =
          await prisma.$queryRaw`SELECT ST_asText(coordinates) as coordinates from "Location" where id = ${property.locationId}`;

        const geoJSON: any = wktToGeoJSON(coordinates[0]?.coordinates || "");
        const longitude = geoJSON.coordinates[0];
        const latitude = geoJSON.coordinates[1];

        return {
          ...property,
          location: {
            ...property.location,
            coordinates: {
              longitude,
              latitude,
            },
          },
        };
      }),
    );

    res.json(propertiesWithFormattedLocation);
  } catch (err: any) {
    res.status(500).json({
      message: `Error retrieving current residences: ${err.message}`,
    });
  }
};

// Add favorite property
const addFavoriteProperty = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId, propertyId } = req.params;
    const tenantId = getParamString(userId);
    const propId = parseInt(getParamString(propertyId) || "0");

    console.log("📝 Add Favorite Request:", { tenantId, propId });

    if (!tenantId || isNaN(propId)) {
      res.status(400).json({ message: "Invalid user ID or property ID" });
      return;
    }

    // Check if tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { userId: tenantId },
      include: {
        favorites: { select: { id: true } },
      },
    });

    if (!tenant) {
      res.status(404).json({ message: "Tenant not found" });
      return;
    }

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id: propId },
    });

    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }

    // Check if already favorite
    const existingFavorites = tenant.favorites || [];
    const isAlreadyFavorite = existingFavorites.some(
      (fav) => fav.id === propId,
    );

    if (isAlreadyFavorite) {
      res.status(400).json({ message: "Property already in favorites" });
      return;
    }

    const updatedTenant = await prisma.tenant.update({
      where: { userId: tenantId },
      data: {
        favorites: {
          connect: { id: propId },
        },
      },
      include: {
        favorites: true,
      },
    });

    console.log("✅ Favorite added successfully:", updatedTenant);
    res.json(updatedTenant);
  } catch (error: any) {
    console.error("Error adding favorite property:", error);
    res.status(500).json({
      message: `Error adding favorite property: ${error.message}`,
    });
  }
};

// Remove favorite property
const removeFavoriteProperty = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { userId, propertyId } = req.params;
    const tenantId = getParamString(userId);
    const propId = parseInt(getParamString(propertyId) || "0");

    console.log("📝 Remove Favorite Request:", { tenantId, propId });

    if (!tenantId || isNaN(propId)) {
      res.status(400).json({ message: "Invalid user ID or property ID" });
      return;
    }

    // Check if tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { userId: tenantId },
    });

    if (!tenant) {
      res.status(404).json({ message: "Tenant not found" });
      return;
    }

    const updatedTenant = await prisma.tenant.update({
      where: { userId: tenantId },
      data: {
        favorites: {
          disconnect: { id: propId },
        },
      },
      include: {
        favorites: true,
      },
    });

    console.log("✅ Favorite removed successfully:", updatedTenant);
    res.json(updatedTenant);
  } catch (error: any) {
    console.error("Error removing favorite property:", error);
    res.status(500).json({
      message: `Error removing favorite property: ${error.message}`,
    });
  }
};

export {
  getTenant,
  createTenant,
  updateTenant,
  deleteTenant,
  getCurrentResidences,
  addFavoriteProperty,
  removeFavoriteProperty,
};
