import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import { attachRequestContext } from "./middlewares/request-context.middleware.js";
import { apiRouter } from "./routes/index.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", env.trustProxyHops);

app.use(attachRequestContext);
app.use(
  compression({
    threshold: 1024
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      const corsError = new Error("Origin not allowed by CORS");
      corsError.statusCode = 403;

      return callback(corsError);
    },
    credentials: true
  })
);
app.use(helmet());
app.use(cookieParser());
app.use(
  express.json({
    limit: "100kb",
    verify(req, res, buffer) {
      req.rawBody = buffer.toString("utf8");
    }
  })
);
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

app.get("/", (req, res) => {
  return res.status(200).json({
    name: env.serviceName,
    version: "0.1.0",
    requestId: req.requestId
  });
});

app.use("/api", apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
