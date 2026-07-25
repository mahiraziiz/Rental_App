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

// Get all properties with filters
const getProperties = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      location,
      priceMin,
      priceMax,
      beds,
      baths,
      propertyType,
      squareFeetMin,
      squareFeetMax,
      amenities,
      availableFrom,
      favoriteIds,
      managerUserId,
      latitude,
      longitude,
    } = req.query;

    console.log("📝 Get Properties Query:", req.query);

    // Build where clause
    const where: any = {
      isActive: true,
    };

    // Location filter
    if (location) {
      where.OR = [
        {
          location: {
            address: { contains: location as string, mode: "insensitive" },
          },
        },
        {
          location: {
            city: { contains: location as string, mode: "insensitive" },
          },
        },
        {
          location: {
            state: { contains: location as string, mode: "insensitive" },
          },
        },
        {
          location: {
            country: { contains: location as string, mode: "insensitive" },
          },
        },
        {
          location: {
            postalCode: { contains: location as string, mode: "insensitive" },
          },
        },
      ];
    }

    // Price range
    if (priceMin || priceMax) {
      where.pricePerMonth = {};
      if (priceMin) where.pricePerMonth.gte = parseFloat(priceMin as string);
      if (priceMax) where.pricePerMonth.lte = parseFloat(priceMax as string);
    }

    // Beds
    if (beds) {
      where.beds = { gte: parseInt(beds as string) };
    }

    // Baths
    if (baths) {
      where.baths = { gte: parseFloat(baths as string) };
    }

    // Property type
    if (propertyType) {
      where.propertyType = propertyType as any;
    }

    // Square feet range
    if (squareFeetMin || squareFeetMax) {
      where.squareFeet = {};
      if (squareFeetMin)
        where.squareFeet.gte = parseInt(squareFeetMin as string);
      if (squareFeetMax)
        where.squareFeet.lte = parseInt(squareFeetMax as string);
    }

    // Amenities
    if (amenities) {
      const amenityList = (amenities as string).split(",");
      where.amenities = { hasEvery: amenityList };
    }

    // Manager filter
    if (managerUserId) {
      where.managerUserId = managerUserId as string;
    }

    // Favorite IDs filter
    if (favoriteIds) {
      const ids = (favoriteIds as string).split(",").map((id) => parseInt(id));
      where.id = { in: ids };
    }

    // Get properties
    const properties = await prisma.property.findMany({
      where,
      include: {
        location: true,
        manager: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format properties with coordinates
    const propertiesWithCoordinates = await Promise.all(
      properties.map(async (property) => {
        let coordinates = null;
        if (property.location) {
          try {
            const result: any = await prisma.$queryRaw`
              SELECT ST_AsText(coordinates) as coordinates 
              FROM "Location" 
              WHERE id = ${property.locationId}
            `;
            if (result && result[0] && result[0].coordinates) {
              const geoJSON: any = wktToGeoJSON(result[0].coordinates);
              if (geoJSON && geoJSON.coordinates) {
                coordinates = {
                  longitude: geoJSON.coordinates[0],
                  latitude: geoJSON.coordinates[1],
                };
              }
            }
          } catch (error) {
            console.error("Error parsing coordinates:", error);
          }
        }

        return {
          ...property,
          location: {
            ...property.location,
            coordinates,
          },
        };
      }),
    );

    // If latitude and longitude are provided, sort by distance
    if (latitude && longitude) {
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);

      propertiesWithCoordinates.sort((a, b) => {
        const distA = a.location?.coordinates
          ? Math.sqrt(
              Math.pow(a.location.coordinates.latitude - lat, 2) +
                Math.pow(a.location.coordinates.longitude - lng, 2),
            )
          : Infinity;
        const distB = b.location?.coordinates
          ? Math.sqrt(
              Math.pow(b.location.coordinates.latitude - lat, 2) +
                Math.pow(b.location.coordinates.longitude - lng, 2),
            )
          : Infinity;
        return distA - distB;
      });
    }

    console.log(`✅ Found ${propertiesWithCoordinates.length} properties`);
    res.json(propertiesWithCoordinates);
  } catch (error: any) {
    console.error("Error fetching properties:", error);
    res.status(500).json({
      message: `Error fetching properties: ${error.message}`,
    });
  }
};

// Get single property by ID
const getProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const propertyId = parseInt(getParamString(id) || "0");

    if (isNaN(propertyId)) {
      res.status(400).json({ message: "Invalid property ID" });
      return;
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        location: true,
        manager: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        leases: {
          where: { isActive: true },
        },
      },
    });

    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }

    // Get coordinates
    let coordinates = null;
    try {
      const result: any = await prisma.$queryRaw`
        SELECT ST_AsText(coordinates) as coordinates 
        FROM "Location" 
        WHERE id = ${property.locationId}
      `;
      if (result && result[0] && result[0].coordinates) {
        const geoJSON: any = wktToGeoJSON(result[0].coordinates);
        if (geoJSON && geoJSON.coordinates) {
          coordinates = {
            longitude: geoJSON.coordinates[0],
            latitude: geoJSON.coordinates[1],
          };
        }
      }
    } catch (error) {
      console.error("Error parsing coordinates:", error);
    }

    const propertyWithCoordinates = {
      ...property,
      location: {
        ...property.location,
        coordinates,
      },
    };

    res.json(propertyWithCoordinates);
  } catch (error: any) {
    console.error("Error fetching property:", error);
    res.status(500).json({
      message: `Error fetching property: ${error.message}`,
    });
  }
};

// Create property
const createProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name,
      description,
      pricePerMonth,
      securityDeposit,
      applicationFee,
      photoUrls,
      amenities,
      highlights,
      isPetsAllowed,
      isParkingIncluded,
      beds,
      baths,
      squareFeet,
      propertyType,
      address,
      city,
      state,
      country,
      postalCode,
      coordinates,
      managerUserId,
    } = req.body;

    console.log("📝 Create Property Request:", {
      name,
      managerUserId,
      coordinates,
    });

    if (!managerUserId) {
      res.status(400).json({ message: "managerUserId is required" });
      return;
    }

    // Check if manager exists
    const manager = await prisma.manager.findUnique({
      where: { userId: managerUserId },
    });

    if (!manager) {
      res.status(404).json({ message: "Manager not found" });
      return;
    }

    // Create location using raw SQL
    let locationId: number;

    if (coordinates && coordinates.lat && coordinates.lng) {
      // Insert with coordinates using PostGIS
      const result = await prisma.$queryRaw<Array<{ id: number }>>`
        INSERT INTO "Location" (address, city, state, country, "postalCode", coordinates, "createdAt")
        VALUES (${address}, ${city}, ${state}, ${country}, ${postalCode}, 
                ST_SetSRID(ST_MakePoint(${coordinates.lng}, ${coordinates.lat}), 4326), 
                NOW())
        RETURNING id
      `;
      locationId = result[0].id;
    } else {
      // Insert without coordinates
      const result = await prisma.$queryRaw<Array<{ id: number }>>`
        INSERT INTO "Location" (address, city, state, country, "postalCode", "createdAt")
        VALUES (${address}, ${city}, ${state}, ${country}, ${postalCode}, NOW())
        RETURNING id
      `;
      locationId = result[0].id;
    }

    // Create property
    const property = await prisma.property.create({
      data: {
        name,
        description,
        pricePerMonth: parseFloat(pricePerMonth),
        securityDeposit: parseFloat(securityDeposit),
        applicationFee: parseFloat(applicationFee),
        photoUrls: photoUrls || [],
        amenities: amenities || [],
        highlights: highlights || [],
        isPetsAllowed: isPetsAllowed || false,
        isParkingIncluded: isParkingIncluded || false,
        beds: parseInt(beds),
        baths: parseFloat(baths),
        squareFeet: parseInt(squareFeet),
        propertyType: propertyType as any,
        locationId: locationId,
        managerUserId: managerUserId,
      },
      include: {
        location: true,
        manager: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    console.log("✅ Property created successfully:", property.id);
    res.status(201).json(property);
  } catch (error: any) {
    console.error("Error creating property:", error);
    res.status(500).json({
      message: `Error creating property: ${error.message}`,
    });
  }
};

// Update property
const updateProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const propertyId = parseInt(getParamString(id) || "0");

    if (isNaN(propertyId)) {
      res.status(400).json({ message: "Invalid property ID" });
      return;
    }

    const {
      name,
      description,
      pricePerMonth,
      securityDeposit,
      applicationFee,
      photoUrls,
      amenities,
      highlights,
      isPetsAllowed,
      isParkingIncluded,
      beds,
      baths,
      squareFeet,
      propertyType,
      address,
      city,
      state,
      country,
      postalCode,
      coordinates,
    } = req.body;

    // Get existing property
    const existingProperty = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { location: true },
    });

    if (!existingProperty) {
      res.status(404).json({ message: "Property not found" });
      return;
    }

    // Update location using raw SQL
    if (address || city || state || country || postalCode || coordinates) {
      if (coordinates && coordinates.lat && coordinates.lng) {
        await prisma.$executeRaw`
          UPDATE "Location" 
          SET address = ${address || existingProperty.location.address},
              city = ${city || existingProperty.location.city},
              state = ${state || existingProperty.location.state},
              country = ${country || existingProperty.location.country},
              "postalCode" = ${postalCode || existingProperty.location.postalCode},
              coordinates = ST_SetSRID(ST_MakePoint(${coordinates.lng}, ${coordinates.lat}), 4326)
          WHERE id = ${existingProperty.locationId}
        `;
      } else {
        await prisma.$executeRaw`
          UPDATE "Location" 
          SET address = ${address || existingProperty.location.address},
              city = ${city || existingProperty.location.city},
              state = ${state || existingProperty.location.state},
              country = ${country || existingProperty.location.country},
              "postalCode" = ${postalCode || existingProperty.location.postalCode}
          WHERE id = ${existingProperty.locationId}
        `;
      }
    }

    // Update property
    const property = await prisma.property.update({
      where: { id: propertyId },
      data: {
        name: name || existingProperty.name,
        description: description || existingProperty.description,
        pricePerMonth: pricePerMonth || existingProperty.pricePerMonth,
        securityDeposit: securityDeposit || existingProperty.securityDeposit,
        applicationFee: applicationFee || existingProperty.applicationFee,
        photoUrls: photoUrls || existingProperty.photoUrls,
        amenities: amenities || existingProperty.amenities,
        highlights: highlights || existingProperty.highlights,
        isPetsAllowed:
          isPetsAllowed !== undefined
            ? isPetsAllowed
            : existingProperty.isPetsAllowed,
        isParkingIncluded:
          isParkingIncluded !== undefined
            ? isParkingIncluded
            : existingProperty.isParkingIncluded,
        beds: beds || existingProperty.beds,
        baths: baths || existingProperty.baths,
        squareFeet: squareFeet || existingProperty.squareFeet,
        propertyType: propertyType || existingProperty.propertyType,
      },
      include: {
        location: true,
        manager: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    console.log("✅ Property updated successfully:", property.id);
    res.json(property);
  } catch (error: any) {
    console.error("Error updating property:", error);
    res.status(500).json({
      message: `Error updating property: ${error.message}`,
    });
  }
};

// Delete property
const deleteProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const propertyId = parseInt(getParamString(id) || "0");

    if (isNaN(propertyId)) {
      res.status(400).json({ message: "Invalid property ID" });
      return;
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }

    await prisma.property.update({
      where: { id: propertyId },
      data: {
        isActive: false,
      },
    });

    res.json({ message: "Property deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting property:", error);
    res.status(500).json({
      message: `Error deleting property: ${error.message}`,
    });
  }
};

export {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
};
