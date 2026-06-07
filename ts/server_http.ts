import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { randomUUID } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let numberPowersContent: string | null = null;

async function loadNumberPowersContent(): Promise<string> {
  if (numberPowersContent === null) {
    numberPowersContent = await readFile(
      join(__dirname, "numberPowers.txt"),
      "utf-8"
    );
  }
  return numberPowersContent;
}

const app = createMcpExpressApp();

// CORS middleware for browser clients
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, mcp-session-id");
  if (_req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

const server = new McpServer({
  name: "NumberPowersHTTP",
  version: "1.0.0",
});

// Resource: numberpowers://info
server.registerResource(
  "numberpowers",
  "numberpowers://info",
  {
    description: "Praseo's notes on number powers.",
    mimeType: "text/plain",
  },
  async (uri) => {
    const content = await loadNumberPowersContent();
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "text/plain",
          text: content,
        },
      ],
    };
  }
);

// Tool: calculate_powers
server.registerTool(
  "calculate_powers",
  {
    description: "Calculate the square, cube, and 4th power of a number.",
    inputSchema: {
      number: z.number().describe("The input number to calculate powers for."),
    },
  },
  async ({ number }) => {
    const square = number ** 2;
    const cube = number ** 3;
    const fourthPower = number ** 4;
    return {
      content: [
        {
          type: "text",
          text: `${square}, ${cube}, ${fourthPower}`,
        },
      ],
    };
  }
);

// Tool: calculate_negative_powers
server.registerTool(
  "calculate_negative_powers",
  {
    description: "Calculate the negative powers of a number (number^-1, number^-2, number^-3).",
    inputSchema: {
      number: z.number().describe("The input number to calculate negative powers for."),
    },
  },
  async ({ number }) => {
    if (number === 0) {
      throw new Error("Cannot calculate negative powers of zero (division by zero)");
    }
    const neg1 = number ** -1;
    const neg2 = number ** -2;
    const neg3 = number ** -3;
    return {
      content: [
        {
          type: "text",
          text: `${neg1}, ${neg2}, ${neg3}`,
        },
      ],
    };
  }
);

// Prompt: powers_explanation
server.registerPrompt(
  "powers_explanation",
  {
    description: "A prompt that explains the powers of a number.",
    argsSchema: {
      number: z.number().describe("The number to explain powers for."),
    },
  },
  async ({ number }) => {
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please calculate and explain the powers of the number ${number}.\nInclude the square (${number}^2), cube (${number}^3), 4th power (${number}^4), and negative powers (${number}^-1, ${number}^-2, ${number}^-3).`,
          },
        },
      ],
    };
  }
);

// Store transports by session ID
const transports: Record<string, StreamableHTTPServerTransport> = {};

// MCP endpoint - handles GET (SSE), POST (messages), and DELETE (session termination)
app.all("/mcp", async (req, res) => {
  try {
    // Check for existing session ID
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    let transport: StreamableHTTPServerTransport | undefined;

    if (sessionId && transports[sessionId]) {
      // Reuse existing transport
      transport = transports[sessionId];
    } else if (!sessionId && req.method === "POST" && isInitializeRequest(req.body)) {
      // New initialization request - create new transport
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          console.log(`Session initialized with ID: ${sessionId}`);
          transports[sessionId] = transport!;
        },
      });

      // Set up onclose handler to clean up transport when closed
      transport.onclose = () => {
        const sid = transport?.sessionId;
        if (sid && transports[sid]) {
          console.log(`Transport closed for session ${sid}`);
          delete transports[sid];
        }
      };

      // Connect the transport to the MCP server
      await server.connect(transport);
    } else {
      // Invalid request - no session ID or not initialization request
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided",
        },
        id: null,
      });
      return;
    }

    // Handle the request with the transport
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      });
    }
  }
});

const PORT = process.env.PORT || 8001;

app.listen(PORT, () => {
  console.log(`MCP HTTP/Streamable server running on http://localhost:${PORT}`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
});
