import { Request, Response } from "express";
import prisma from "../db";

// Helper to get string from params
const getParamString = (
  param: string | string[] | undefined,
): string | undefined => {
  if (typeof param === "string") return param;
  if (Array.isArray(param) && param.length > 0) return param[0];
  return undefined;
};

// Get applications with filters
const getApplications = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, userType } = req.query;

    const where: any = {};

    if (userId && userType) {
      if (userType === "tenant") {
        where.tenantUserId = userId as string;
      } else if (userType === "manager") {
        where.property = {
          managerUserId: userId as string,
        };
      }
    }

    const applications = await prisma.application.findMany({
      where,
      include: {
        property: {
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
        },
        tenant: {
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
        lease: true,
      },
      orderBy: {
        applicationDate: 'desc',
      },
    });

    res.json(applications);
  } catch (error: any) {
    console.error("Error fetching applications:", error);
    res.status(500).json({
      message: `Error fetching applications: ${error.message}`,
    });
  }
};

// Create application
const createApplication = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      propertyId,
      tenantUserId,
      message,
      status = "Pending",
    } = req.body;

    console.log("📝 Create Application Request:", {
      propertyId,
      tenantUserId,
      message,
    });

    if (!propertyId || !tenantUserId) {
      res.status(400).json({ message: "propertyId and tenantUserId are required" });
      return;
    }

    // Check if property exists
    const property = await prisma.property.findUnique({
      where: { id: parseInt(propertyId) },
    });

    if (!property) {
      res.status(404).json({ message: "Property not found" });
      return;
    }

    // Check if tenant exists using userId
    const tenant = await prisma.tenant.findUnique({
      where: { userId: tenantUserId },
    });

    if (!tenant) {
      res.status(404).json({ message: "Tenant not found" });
      return;
    }

    // Check if application already exists
    const existingApplication = await prisma.application.findFirst({
      where: {
        propertyId: parseInt(propertyId),
        tenantUserId: tenantUserId,
        status: {
          in: ["Pending", "Approved"],
        },
      },
    });

    if (existingApplication) {
      res.status(400).json({ message: "You already have an active application for this property" });
      return;
    }

    const application = await prisma.application.create({
      data: {
        propertyId: parseInt(propertyId),
        tenantUserId: tenantUserId,
        message: message || "",
        status: status as any,
      },
      include: {
        property: {
          include: {
            location: true,
          },
        },
        tenant: {
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

    console.log("✅ Application created successfully:", application.id);
    res.status(201).json(application);
  } catch (error: any) {
    console.error("Error creating application:", error);
    res.status(500).json({
      message: `Error creating application: ${error.message}`,
    });
  }
};

// Update application status
const updateApplicationStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const applicationId = parseInt(getParamString(id) || "0");

    if (isNaN(applicationId)) {
      res.status(400).json({ message: "Invalid application ID" });
      return;
    }

    const { status } = req.body;

    if (!status) {
      res.status(400).json({ message: "Status is required" });
      return;
    }

    const application = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status,
      },
      include: {
        property: {
          include: {
            location: true,
          },
        },
        tenant: {
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
        lease: true,
      },
    });

    // If approved, create a lease
    if (status === "Approved") {
      const lease = await prisma.lease.create({
        data: {
          propertyId: application.propertyId,
          tenantUserId: application.tenantUserId,
          startDate: new Date(),
          endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          rent: application.property.pricePerMonth,
          deposit: application.property.securityDeposit,
          isActive: true,
        },
      });

      // Update application with lease ID
      await prisma.application.update({
        where: { id: applicationId },
        data: {
          leaseId: lease.id,
        },
      });

      res.json({
        ...application,
        lease,
      });
    } else {
      res.json(application);
    }
  } catch (error: any) {
    console.error("Error updating application status:", error);
    res.status(500).json({
      message: `Error updating application status: ${error.message}`,
    });
  }
};

export {
  getApplications,
  createApplication,
  updateApplicationStatus,
};