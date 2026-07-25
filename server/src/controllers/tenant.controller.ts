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
    const tenantId = getParamString(id);

    if (!tenantId) {
      res.status(400).json({ message: "Invalid tenant ID" });
      return;
    }

    const tenant = await prisma.tenant.findUnique({
      where: {
        cognitoId: tenantId,
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
    const { cognitoId, name, email, phoneNumber } = req.body;

    if (!cognitoId) {
      res.status(400).json({ message: "cognitoId is required" });
      return;
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: cognitoId },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const tenant = await prisma.tenant.create({
      data: {
        cognitoId,
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
    const tenantId = getParamString(id);

    if (!tenantId) {
      res.status(400).json({ message: "Invalid tenant ID" });
      return;
    }

    const { name, email, phoneNumber } = req.body;

    const updatedTenant = await prisma.tenant.update({
      where: {
        cognitoId: tenantId,
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
    const tenantId = getParamString(id);

    if (!tenantId) {
      res.status(400).json({ message: "Invalid tenant ID" });
      return;
    }

    // Get tenant with relations
    const tenant = await prisma.tenant.findUnique({
      where: { cognitoId: tenantId },
      include: {
        favorites: { select: { id: true } },
        properties: { select: { id: true } },
      },
    });

    if (!tenant) {
      res.status(404).json({ message: "Tenant not found" });
      return;
    }

    // Delete tenant and associated user
    await prisma.$transaction(async (tx) => {
      // Remove tenant from favorites and properties first
      if (tenant.favorites && tenant.favorites.length > 0) {
        await tx.tenant.update({
          where: { cognitoId: tenantId },
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
          where: { cognitoId: tenantId },
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
        where: { cognitoId: tenantId },
      });

      // Delete user
      await tx.user.delete({
        where: { id: tenantId },
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
    const tenantId = getParamString(id);

    if (!tenantId) {
      res.status(400).json({ message: "Invalid tenant ID" });
      return;
    }

    const properties = await prisma.property.findMany({
      where: {
        tenants: {
          some: { cognitoId: tenantId },
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
    const { cognitoId, propertyId } = req.params;
    const tenantId = getParamString(cognitoId);
    const propId = parseInt(getParamString(propertyId) || "0");

    if (!tenantId || isNaN(propId)) {
      res.status(400).json({ message: "Invalid tenant ID or property ID" });
      return;
    }

    // Get current favorites
    const tenant = await prisma.tenant.findUnique({
      where: { cognitoId: tenantId },
      include: {
        favorites: { select: { id: true } },
      },
    });

    if (!tenant) {
      res.status(404).json({ message: "Tenant not found" });
      return;
    }

    const existingFavorites = tenant.favorites || [];
    const isAlreadyFavorite = existingFavorites.some(
      (fav) => fav.id === propId,
    );

    if (isAlreadyFavorite) {
      res.status(400).json({ message: "Property already in favorites" });
      return;
    }

    const updatedTenant = await prisma.tenant.update({
      where: { cognitoId: tenantId },
      data: {
        favorites: {
          connect: { id: propId },
        },
      },
    });

    res.json(updatedTenant);
  } catch (error: any) {
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
    const { cognitoId, propertyId } = req.params;
    const tenantId = getParamString(cognitoId);
    const propId = parseInt(getParamString(propertyId) || "0");

    if (!tenantId || isNaN(propId)) {
      res.status(400).json({ message: "Invalid tenant ID or property ID" });
      return;
    }

    const updatedTenant = await prisma.tenant.update({
      where: { cognitoId: tenantId },
      data: {
        favorites: {
          disconnect: { id: propId },
        },
      },
    });

    res.json(updatedTenant);
  } catch (error: any) {
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
