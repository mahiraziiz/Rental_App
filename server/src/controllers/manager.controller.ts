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

// Get manager by ID
const getManager = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = getParamString(id);

    if (!userId) {
      res.status(400).json({ message: "Invalid user ID" });
      return;
    }

    const manager = await prisma.manager.findUnique({
      where: {
        userId: userId,
      },
      include: {
        managedProperties: true,
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

// Create manager
const createManager = async (req: Request, res: Response): Promise<void> => {
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

    const manager = await prisma.manager.create({
      data: {
        userId,
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
    const userId = getParamString(id);

    if (!userId) {
      res.status(400).json({ message: "Invalid user ID" });
      return;
    }

    const { name, email, phoneNumber } = req.body;

    const updatedManager = await prisma.manager.update({
      where: {
        userId: userId,
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

// Delete manager
const deleteManager = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = getParamString(id);

    if (!userId) {
      res.status(400).json({ message: "Invalid user ID" });
      return;
    }

    // Get manager with relations
    const manager = await prisma.manager.findUnique({
      where: { userId: userId },
      include: {
        managedProperties: { select: { id: true } },
      },
    });

    if (!manager) {
      res.status(404).json({ message: "Manager not found" });
      return;
    }

    // Delete manager and associated user
    await prisma.$transaction(async (tx) => {
      // Delete manager
      await tx.manager.delete({
        where: { userId: userId },
      });

      // Delete user
      await tx.user.delete({
        where: { id: userId },
      });
    });

    res.json({ message: "Manager account deleted successfully" });
  } catch (error: any) {
    res.status(500).json({
      message: `Error deleting manager: ${error.message}`,
    });
  }
};

// Get manager's properties
const getManagerProperties = async (
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
        managerUserId: userId,
      },
      include: {
        location: true,
      },
    });

    res.json(properties);
  } catch (error: any) {
    res.status(500).json({
      message: `Error retrieving manager properties: ${error.message}`,
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
