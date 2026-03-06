// Mock API documentation endpoint
export default function handler(req, res) {
  if (req.method === 'GET') {
    // Return basic API documentation structure
    res.status(200).json({
      openapi: "3.0.0",
      info: {
        title: "AutoRia API",
        version: "1.0.0",
        description: "AutoRia Backend API Documentation"
      },
      servers: [
        {
          url: "https://autoria-clone.vercel.app/api",
          description: "Production server"
        }
      ],
      paths: {
        "/health": {
          get: {
            summary: "Health Check",
            description: "Check API health status",
            responses: {
              "200": {
                description: "API is healthy",
                content: {
                  "application/json": {
                    schema: {
                      type: "object",
                      properties: {
                        status: { type: "string" },
                        message: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
