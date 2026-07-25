import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { wktToGeoJSON } from "@terraformer/wkt";
import { Location } from "@prisma/client";
import axios from "axios";
import prisma from "../db";
import { AuthRequest } from "../middleware/auth.middleware";
import UploadService from "../services/upload.service";

// ============================
// Helper Functions
// ============================
const parseBooleanValue = (value: unknown): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["true", "1", "on", "yes"].includes(normalized);
  }
  return false;
};

const getManagerIdFromRequest = (req: AuthRequest): string | null => {
  const user = req.user;
  if (!user) return null;
  return user.id || null;
};

const parseCoordinateValue = (
  value: unknown,
  min: number,
  max: number,
): number | null => {
  if (value === undefined || value === null || value === "") return null;

  const parsed =
    typeof value === "number" ? value : parseFloat(String(value).trim());

  if (Number.isNaN(parsed) || parsed < min || parsed > max) {
    throw new Error("INVALID_COORDINATES");
  }

  return parsed;
};

const geocodeCoordinates = async (
  address: string,
  city: string,
  state: string,
  postalCode: string,
  country: string,
): Promise<{ longitude: number; latitude: number }> => {
  const geocodeQuery = [address, city, state, postalCode, country]
    .filter(Boolean)
    .join(", ");

  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?${new URLSearchParams(
      {
        q: geocodeQuery,
        format: "json",
        limit: "1",
        addressdetails: "1",
      },
    ).toString()}`;

    const nominatimResponse = await axios.get(nominatimUrl, {
      headers: {
        "User-Agent": "RealEstateApp (justsomedummyemail@gmail.com)",
      },
      timeout: 10000,
    });

    const nominatimResult = nominatimResponse.data?.[0];
    if (nominatimResult?.lon && nominatimResult?.lat) {
      return {
        longitude: parseFloat(nominatimResult.lon),
        latitude: parseFloat(nominatimResult.lat),
      };
    }
  } catch (error) {
    console.warn("Primary geocoding provider failed, trying fallback provider");
  }

  try {
    const fallbackUrl = `https://geocode.maps.co/search?${new URLSearchParams({
      q: geocodeQuery,
    }).toString()}`;

    const fallbackResponse = await axios.get(fallbackUrl, {
      timeout: 10000,
    });

    const fallbackResult = fallbackResponse.data?.[0];
    if (fallbackResult?.lon && fallbackResult?.lat) {
      return {
        longitude: parseFloat(fallbackResult.lon),
        latitude: parseFloat(fallbackResult.lat),
      };
    }
  } catch (error) {
    console.warn("Fallback geocoding provider failed");
  }

  throw new Error("GEOCODING_FAILED");
};

const resolveCoordinates = async (params: {
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: unknown;
  longitude?: unknown;
}): Promise<{ longitude: number; latitude: number }> => {
  const manualLatitude = parseCoordinateValue(params.latitude, -90, 90);
  const manualLongitude = parseCoordinateValue(params.longitude, -180, 180);

  if (
    (manualLatitude !== null && manualLongitude === null) ||
    (manualLatitude === null && manualLongitude !== null)
  ) {
    throw new Error("INCOMPLETE_COORDINATES");
  }

  if (manualLatitude !== null && manualLongitude !== null) {
    return {
      latitude: manualLatitude,
      longitude: manualLongitude,
    };
  }

  return geocodeCoordinates(
    params.address,
    params.city,
    params.state,
    params.postalCode,
    params.country,
  );
};

// ============================
// Query Builder Helpers
// ============================
const buildPropertyWhereConditions = (query: any): Prisma.Sql[] => {
  const conditions: Prisma.Sql[] = [];

  // Always filter active properties
  conditions.push(Prisma.sql`p."isActive" = true`);

  if (query.favoriteIds) {
    const favoriteIdsArray = (query.favoriteIds as string)
      .split(",")
      .map(Number);
    conditions.push(Prisma.sql`p.id IN (${Prisma.join(favoriteIdsArray)})`);
  }

  if (query.managerCognitoId) {
    conditions.push(
      Prisma.sql`p."managerCognitoId" = ${query.managerCognitoId}`,
    );
  }

  if (query.location) {
    conditions.push(
      Prisma.sql`(l.city ILIKE ${`%${query.location}%`} OR l.state ILIKE ${`%${query.location}%`} OR l.address ILIKE ${`%${query.location}%`})`,
    );
  }

  if (query.priceMin) {
    conditions.push(Prisma.sql`p."pricePerMonth" >= ${Number(query.priceMin)}`);
  }

  if (query.priceMax) {
    conditions.push(Prisma.sql`p."pricePerMonth" <= ${Number(query.priceMax)}`);
  }

  if (query.beds && query.beds !== "any") {
    conditions.push(Prisma.sql`p.beds >= ${Number(query.beds)}`);
  }

  if (query.baths && query.baths !== "any") {
    conditions.push(Prisma.sql`p.baths >= ${Number(query.baths)}`);
  }

  if (query.squareFeetMin) {
    conditions.push(
      Prisma.sql`p."squareFeet" >= ${Number(query.squareFeetMin)}`,
    );
  }

  if (query.squareFeetMax) {
    conditions.push(
      Prisma.sql`p."squareFeet" <= ${Number(query.squareFeetMax)}`,
    );
  }

  if (query.propertyType && query.propertyType !== "any") {
    conditions.push(
      Prisma.sql`p."propertyType" = ${query.propertyType}::"PropertyType"`,
    );
  }

  if (query.amenities && query.amenities !== "any") {
    const amenitiesArray = (query.amenities as string).split(",");
    conditions.push(Prisma.sql`p.amenities @> ${amenitiesArray}`);
  }

  if (query.availableFrom && query.availableFrom !== "any") {
    const date = new Date(query.availableFrom as string);
    if (!isNaN(date.getTime())) {
      conditions.push(
        Prisma.sql`EXISTS (
          SELECT 1 FROM "Lease" l 
          WHERE l."propertyId" = p.id 
          AND l."startDate" <= ${date.toISOString()}
        )`,
      );
    }
  }

  if (query.latitude !== undefined && query.longitude !== undefined) {
    const lat = parseFloat(query.latitude as string);
    const lng = parseFloat(query.longitude as string);

    if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
      const radiusInKilometers = 1000;
      const degrees = radiusInKilometers / 111;

      conditions.push(
        Prisma.sql`ST_DWithin(
          l.coordinates::geometry,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
          ${degrees}
        )`,
      );
    }
  }

  return conditions;
};

// ============================
// Controller Functions
// ============================
const getProperties = async (req: Request, res: Response): Promise<void> => {
  try {
    const query = req.query;
    const whereConditions = buildPropertyWhereConditions(query);

    const completeQuery = Prisma.sql`
      SELECT 
        p.*,
        json_build_object(
          'id', l.id,
          'address', l.address,
          'city', l.city,
          'state', l.state,
          'country', l.country,
          'postalCode', l."postalCode",
          'coordinates', json_build_object(
            'longitude', ST_X(l."coordinates"::geometry),
            'latitude', ST_Y(l."coordinates"::geometry)
          )
        ) as location
      FROM "Property" p
      JOIN "Location" l ON p."locationId" = l.id
      ${
        whereConditions.length > 0
          ? Prisma.sql`WHERE ${Prisma.join(whereConditions, " AND ")}`
          : Prisma.empty
      }
    `;

    console.log("\n[Property Controller] GET /properties called");
    console.log("[Property Controller] Query filters received:", query);
    console.log(
      "[Property Controller] WHERE conditions count:",
      whereConditions.length,
    );

    const properties = await prisma.$queryRaw(completeQuery);

    if (Array.isArray(properties) && properties.length > 0) {
      console.log("[Property Controller] First property:", properties[0]);
    }

    res.json(properties);
  } catch (error: any) {
    console.error("[Property Controller] ERROR:", error);
    res.status(500).json({
      message: `Error retrieving properties: ${error.message}`,
      error: error.message,
      details: error.toString(),
    });
  }
};

const getProperty = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const propertyId = Number(id);

    if (Number.isNaN(propertyId)) {
      res.status(400).json({ message: "Invalid property id" });
      return;
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        location: true,
      },
    });

    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }

    const coordinates: { coordinates: string }[] = await prisma.$queryRaw`
      SELECT ST_asText(coordinates) as coordinates 
      FROM "Location" 
      WHERE id = ${property.locationId}
    `;

    const geoJSON: any = wktToGeoJSON(coordinates[0]?.coordinates || "");
    const longitude = geoJSON.coordinates[0];
    const latitude = geoJSON.coordinates[1];

    const propertyWithCoordinates = {
      ...property,
      location: {
        ...property.location,
        coordinates: {
          longitude,
          latitude,
        },
      },
    };

    res.json(propertyWithCoordinates);
  } catch (err: any) {
    res.status(500).json({
      message: `Error retrieving property: ${err.message}`,
    });
  }
};

const createProperty = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const files = (req.files as Express.Multer.File[]) || [];
    const {
      address,
      city,
      state,
      country,
      postalCode,
      latitude,
      longitude,
      managerCognitoId,
      ...propertyData
    } = req.body;

    // Get manager ID
    const managerId = getManagerIdFromRequest(req) || managerCognitoId;

    if (!managerId) {
      res.status(401).json({
        message: "Manager identity could not be verified",
      });
      return;
    }

    // Verify manager exists
    const manager = await prisma.manager.findUnique({
      where: { cognitoId: managerId },
    });

    if (!manager) {
      res.status(404).json({
        message:
          "Manager profile not found. Please complete your profile first.",
      });
      return;
    }

    // Upload images to Cloudinary using UploadService
    const photoUrls = await UploadService.uploadMultipleFiles(
      files,
      "properties",
    );

    // Resolve coordinates
    let coordinates;
    try {
      coordinates = await resolveCoordinates({
        address,
        city,
        state,
        country,
        postalCode,
        latitude,
        longitude,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "UNKNOWN_LOCATION_ERROR";

      if (message === "INVALID_COORDINATES") {
        res.status(400).json({
          message:
            "Latitude must be between -90 and 90 and longitude must be between -180 and 180.",
        });
        return;
      }

      if (message === "INCOMPLETE_COORDINATES") {
        res.status(400).json({
          message: "Please provide both latitude and longitude together.",
        });
        return;
      }

      if (message === "GEOCODING_FAILED") {
        res.status(400).json({
          message:
            "Could not find this address on the map. Please refine the address or provide latitude and longitude.",
        });
        return;
      }

      throw error;
    }

    // Create location
    const [location] = await prisma.$queryRaw<Location[]>`
      INSERT INTO "Location" (address, city, state, country, "postalCode", coordinates)
      VALUES (
        ${address}, 
        ${city}, 
        ${state}, 
        ${country}, 
        ${postalCode}, 
        ST_SetSRID(ST_MakePoint(${coordinates.longitude}, ${coordinates.latitude}), 4326)
      )
      RETURNING id, address, city, state, country, "postalCode", ST_AsText(coordinates) as coordinates;
    `;

    // Create property
    const newProperty = await prisma.property.create({
      data: {
        ...propertyData,
        photoUrls,
        locationId: location.id,
        managerCognitoId: managerId,
        amenities:
          typeof propertyData.amenities === "string"
            ? propertyData.amenities.split(",")
            : [],
        highlights:
          typeof propertyData.highlights === "string"
            ? propertyData.highlights.split(",")
            : [],
        isPetsAllowed: parseBooleanValue(propertyData.isPetsAllowed),
        isParkingIncluded: parseBooleanValue(propertyData.isParkingIncluded),
        pricePerMonth: parseFloat(propertyData.pricePerMonth),
        securityDeposit: parseFloat(propertyData.securityDeposit),
        applicationFee: parseFloat(propertyData.applicationFee),
        beds: parseInt(propertyData.beds),
        baths: parseFloat(propertyData.baths),
        squareFeet: parseInt(propertyData.squareFeet),
      },
      include: {
        location: true,
        manager: true,
      },
    });

    res.status(201).json(newProperty);
  } catch (err: any) {
    res.status(500).json({
      message: `Error creating property: ${err.message}`,
    });
  }
};

const updateProperty = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const propertyId = Number(req.params.id);

    if (Number.isNaN(propertyId)) {
      res.status(400).json({ message: "Invalid property id" });
      return;
    }

    const existingProperty = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { location: true },
    });

    if (!existingProperty) {
      res.status(404).json({ message: "Property not found" });
      return;
    }

    // Verify ownership
    const requestedManagerIdFromBody =
      typeof req.body.managerCognitoId === "string"
        ? req.body.managerCognitoId
        : null;
    const managerCognitoId =
      getManagerIdFromRequest(req) ?? requestedManagerIdFromBody;

    if (!managerCognitoId) {
      res.status(401).json({
        message: "Manager identity could not be verified",
      });
      return;
    }

    if (existingProperty.managerCognitoId !== managerCognitoId) {
      res.status(403).json({
        message: "You can only edit your own properties",
      });
      return;
    }

    const files = (req.files as Express.Multer.File[]) || [];
    const {
      address,
      city,
      state,
      country,
      postalCode,
      latitude,
      longitude,
      amenities,
      highlights,
      isPetsAllowed,
      isParkingIncluded,
      pricePerMonth,
      securityDeposit,
      applicationFee,
      beds,
      baths,
      squareFeet,
      ...propertyData
    } = req.body;

    // Upload new images if any using UploadService
    let nextPhotoUrls: string[] | undefined;
    if (files.length > 0) {
      nextPhotoUrls = await UploadService.uploadMultipleFiles(
        files,
        "properties",
      );
    }

    // Update location if needed
    const hasLocationUpdate = [
      address,
      city,
      state,
      country,
      postalCode,
      latitude,
      longitude,
    ].some((value) => value !== undefined && value !== null && value !== "");

    if (hasLocationUpdate) {
      const nextLocation = {
        address: address ?? existingProperty.location.address,
        city: city ?? existingProperty.location.city,
        state: state ?? existingProperty.location.state,
        country: country ?? existingProperty.location.country,
        postalCode: postalCode ?? existingProperty.location.postalCode,
      };

      try {
        const coordinates = await resolveCoordinates({
          ...nextLocation,
          latitude,
          longitude,
        });

        await prisma.$executeRaw`
          UPDATE "Location"
          SET
            address = ${nextLocation.address},
            city = ${nextLocation.city},
            state = ${nextLocation.state},
            country = ${nextLocation.country},
            "postalCode" = ${nextLocation.postalCode},
            coordinates = ST_SetSRID(ST_MakePoint(${coordinates.longitude}, ${coordinates.latitude}), 4326)
          WHERE id = ${existingProperty.locationId}
        `;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "UNKNOWN_LOCATION_ERROR";

        if (message === "INVALID_COORDINATES") {
          res.status(400).json({
            message:
              "Latitude must be between -90 and 90 and longitude must be between -180 and 180.",
          });
          return;
        }

        if (message === "INCOMPLETE_COORDINATES") {
          res.status(400).json({
            message: "Please provide both latitude and longitude together.",
          });
          return;
        }

        if (message === "GEOCODING_FAILED") {
          res.status(400).json({
            message:
              "Could not find this address on the map. Please refine the address or provide latitude and longitude.",
          });
          return;
        }

        throw error;
      }
    }

    // Update property
    const updatedProperty = await prisma.property.update({
      where: { id: propertyId },
      data: {
        ...propertyData,
        ...(nextPhotoUrls ? { photoUrls: nextPhotoUrls } : {}),
        ...(typeof amenities === "string"
          ? { amenities: amenities.split(",").filter(Boolean) }
          : {}),
        ...(typeof highlights === "string"
          ? { highlights: highlights.split(",").filter(Boolean) }
          : {}),
        ...(isPetsAllowed !== undefined
          ? { isPetsAllowed: parseBooleanValue(isPetsAllowed) }
          : {}),
        ...(isParkingIncluded !== undefined
          ? { isParkingIncluded: parseBooleanValue(isParkingIncluded) }
          : {}),
        ...(pricePerMonth !== undefined
          ? { pricePerMonth: parseFloat(pricePerMonth) }
          : {}),
        ...(securityDeposit !== undefined
          ? { securityDeposit: parseFloat(securityDeposit) }
          : {}),
        ...(applicationFee !== undefined
          ? { applicationFee: parseFloat(applicationFee) }
          : {}),
        ...(beds !== undefined ? { beds: parseInt(beds) } : {}),
        ...(baths !== undefined ? { baths: parseFloat(baths) } : {}),
        ...(squareFeet !== undefined
          ? { squareFeet: parseInt(squareFeet) }
          : {}),
      },
      include: {
        location: true,
        manager: true,
      },
    });

    res.json(updatedProperty);
  } catch (err: any) {
    res.status(500).json({
      message: `Error updating property: ${err.message}`,
    });
  }
};

// ============================
// Exports
// ============================
export { getProperties, getProperty, createProperty, updateProperty };
