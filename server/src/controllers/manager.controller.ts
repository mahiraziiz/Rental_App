import { Request, Response } from "express";
import { wktToGeoJSON } from "@terraformer/wkt";
import prisma from "../db";
import { AuthRequest } from "../middleware/auth.middleware";

// Helper to safely get string from params
const getParamString = (
  param: string | string[] | undefined,
): string | undefined => {
  if (typeof param === "string") return param;
  if (Array.isArray(param) && param.length > 0) return param[0];
  return undefined;
};

// Get manager by ID (using user ID instead of cognitoId)
const getManager = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const managerId = getParamString(id);

    if (!managerId) {
      res.status(400).json({ message: "Invalid manager ID" });
      return;
    }

    const manager = await prisma.manager.findUnique({
      where: {
        cognitoId: managerId,
      },
    });

    if (manager) {
      res.json(manager);
    } else {
      res.status(404).json({ message: "Manager not found" });
    }
  } catch (error: any) {
    res.status(500).json({
      message: `Error retrieving manager: ${error.message}`,
    });
  }
};

// Create manager profile
const createManager = async (req: Request, res: Response): Promise<void> => {
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

    const manager = await prisma.manager.create({
      data: {
        cognitoId,
        name,
        email,
        phoneNumber,
      },
    });

    res.status(201).json(manager);
  } catch (error: any) {
    res.status(500).json({
      message: `Error creating manager: ${error.message}`,
    });
  }
};

// Update manager
const updateManager = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const managerId = getParamString(id);

    if (!managerId) {
      res.status(400).json({ message: "Invalid manager ID" });
      return;
    }

    const { name, email, phoneNumber } = req.body;

    const updatedManager = await prisma.manager.update({
      where: {
        cognitoId: managerId,
      },
      data: {
        name,
        email,
        phoneNumber,
      },
    });

    res.json(updatedManager);
  } catch (error: any) {
    res.status(500).json({
      message: `Error updating manager: ${error.message}`,
    });
  }
};

// Delete manager (also delete the associated user)
const deleteManager = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const managerId = getParamString(id);

    if (!managerId) {
      res.status(400).json({ message: "Invalid manager ID" });
      return;
    }

    // Get manager with properties
    const manager = await prisma.manager.findUnique({
      where: { cognitoId: managerId },
      include: {
        managedProperties: { select: { id: true } },
      },
    });

    if (!manager) {
      res.status(404).json({ message: "Manager not found" });
      return;
    }

    if (manager.managedProperties && manager.managedProperties.length > 0) {
      res.status(400).json({
        message:
          "Cannot delete manager account while properties are still assigned. Remove or transfer properties first.",
      });
      return;
    }

    // Delete manager and associated user
    await prisma.$transaction([
      prisma.manager.delete({
        where: { cognitoId: managerId },
      }),
      prisma.user.delete({
        where: { id: managerId },
      }),
    ]);

    res.json({ message: "Manager account deleted successfully" });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: `Error deleting manager: ${error.message}` });
  }
};

// Get manager properties
const getManagerProperties = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const managerId = getParamString(id);

    if (!managerId) {
      res.status(400).json({ message: "Invalid manager ID" });
      return;
    }

    const properties = await prisma.property.findMany({
      where: {
        managerCognitoId: managerId,
      },
      include: {
        location: true,
      },
    });

    const propertiesWithFormattedLocation = await Promise.all(
      properties.map(async (property) => {
        // Use locationId instead of location.id
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
      message: `Error retrieving manager properties: ${err.message}`,
    });
  }
};

export {
  getManager,
  createManager,
  updateManager,
  deleteManager,
  getManagerProperties,
};
