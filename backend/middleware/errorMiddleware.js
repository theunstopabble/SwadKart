const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Catch Prisma Duplicate Key Error (P2002) or MongoDB 11000
  if (err.code === "P2002") {
    const target = err.meta?.target ? Array.isArray(err.meta.target) ? err.meta.target.join(", ") : err.meta.target : "field";
    message = `Duplicate field value entered: ${target}. Please use another value!`;
    statusCode = 400;
  } else if (err.code === 11000) {
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : "field";
    message = `Duplicate field value entered: ${field}. Please use another value!`;
    statusCode = 400;
  }

  // Catch Prisma Record Not Found (P2025)
  if (err.code === "P2025") {
    message = `Resource not found`;
    statusCode = 404;
  }

  // Mongoose bad ObjectId
  if (err.name === "CastError" && err.kind === "ObjectId") {
    message = `Resource not found`;
    statusCode = 404;
  }

  // Mongoose / Prisma Validation Error
  if (err.name === "ValidationError" || err.name === "PrismaClientValidationError") {
    if (err.errors) {
      message = Object.values(err.errors).map((val) => val.message).join(". ");
    }
    statusCode = 400;
  }

  // Suppress auth errors in dev (not actual bugs)
  const isAuthError = message.includes("Not authorized") || message.includes("no token");
  if (!isAuthError) {
    console.error("❌ BACKEND_ERROR:", err);
  }

  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === "development" ? err.stack : null,
  });
};

export { notFound, errorHandler };
