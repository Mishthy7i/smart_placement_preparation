import swaggerJsdoc from "swagger-jsdoc";
import path from "path";

const routesPath = path
    .resolve(process.cwd(), "src", "routes", "*.ts")
    .replace(/\\/g, "/");

const serverPath = path
    .resolve(process.cwd(), "src", "server.ts")
    .replace(/\\/g, "/");

export const swaggerSpec = swaggerJsdoc({
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Smart Placement Portal API",
            version: "1.0.0",
            description: "API documentation for the Smart Placement Portal",
        },
        servers: [
            {
                url: "http://localhost:5000",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
    },
    apis: [routesPath, serverPath],
});