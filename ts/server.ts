import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "NumberPowers",
  version: "1.0.0",
});

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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
