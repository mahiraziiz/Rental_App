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

// Get all leases with optional userId filter
const getLeases = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;

    const where: any = {};

    if (userId) {
      where.tenantUserId = userId as string;
    }

    const leases = await prisma.lease.findMany({
      where,
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
        payments: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    res.json(leases);
  } catch (error: any) {
    console.error("Error fetching leases:", error);
    res.status(500).json({
      message: `Error fetching leases: ${error.message}`,
    });
  }
};

// Get property leases
const getPropertyLeases = async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyId } = req.params;
    const propId = parseInt(getParamString(propertyId) || "0");

    if (isNaN(propId)) {
      res.status(400).json({ message: "Invalid property ID" });
      return;
    }

    const leases = await prisma.lease.findMany({
      where: {
        propertyId: propId,
      },
      include: {
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
        payments: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    res.json(leases);
  } catch (error: any) {
    console.error("Error fetching property leases:", error);
    res.status(500).json({
      message: `Error fetching property leases: ${error.message}`,
    });
  }
};

// Get payments for a lease
const getPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { leaseId } = req.params;
    const leaseIdNum = parseInt(getParamString(leaseId) || "0");

    if (isNaN(leaseIdNum)) {
      res.status(400).json({ message: "Invalid lease ID" });
      return;
    }

    const payments = await prisma.payment.findMany({
      where: {
        leaseId: leaseIdNum,
      },
      orderBy: {
        dueDate: 'desc',
      },
    });

    res.json(payments);
  } catch (error: any) {
    console.error("Error fetching payments:", error);
    res.status(500).json({
      message: `Error fetching payments: ${error.message}`,
    });
  }
};

export {
  getLeases,
  getPropertyLeases,
  getPayments,
};