import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { authMiddleware } from "./middleware/auth.middleware";

/* ROUTE IMPORT */
import authRoutes from "./routes/auth.routes";
import tenantRoutes from "./routes/tenant.routes";
import managerRoutes from "./routes/manager.routes";
import propertyRoutes from "./routes/property.routes";
import leaseRoutes from "./routes/lease.routes";
import applicationRoutes from "./routes/application.routes";

/* CONFIGURATIONS */
dotenv.config();
const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

/* ROUTES */
app.get("/", (req, res) => {
  res.send("This is home route");
});

app.use("/auth", authRoutes);
app.use("/applications", applicationRoutes);
app.use("/properties", propertyRoutes);
app.use("/leases", leaseRoutes);
app.use("/tenants", authMiddleware(["tenant"]), tenantRoutes);
app.use("/managers", authMiddleware(["manager"]), managerRoutes);

export default app;
