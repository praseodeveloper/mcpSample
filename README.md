# MCP Server Sample

A sample repository demonstrating two ways to run an MCP (Model Context Protocol) server using Python: **stdio** (local subprocess) and **HTTP/SSE** (remote HTTP).

## What It Does

Both servers expose a `calculate_powers` tool that computes the square, cube, and 4th power of a number. The HTTP server also adds a `calculate_negative_powers` tool, a `numberpowers://info` resource containing historical notes about number powers, and a `powers_explanation` prompt.

## Project Structure

```
├── server.py                  # Stdio MCP server (single tool)
├── server_http.py             # HTTP/SSE MCP server (two tools + resource)
├── requirements.txt           # Python dependencies
├── numberPowers.txt           # Text file served as a resource
├── opencode.json              # opencode config for HTTP server
└── stdioMcpServerConfig.json  # opencode config template for stdio server
```

## Prerequisites

- Python 3.10+
- An MCP-compatible client (e.g., [opencode](https://opencode.ai))

## Setup

```bash
# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Running the Servers

### Stdio Server (`server.py`)

The stdio server runs as a subprocess and communicates over stdin/stdout. It exposes one tool: `calculate_powers`.

```bash
python server.py
```

### HTTP/SSE Server (`server_http.py`)

The HTTP server runs on `http://localhost:8000` and communicates over Server-Sent Events (SSE). It exposes two tools (`calculate_powers`, `calculate_negative_powers`), one resource (`numberpowers://info`), and one prompt (`powers_explanation`).

```bash
python server_http.py
```

The SSE endpoint is available at `http://localhost:8000/sse`.

## Adding to opencode

### Option 1: Stdio (local subprocess)

Add the following to your `opencode.json` in the project root:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "number-powers": {
      "type": "local",
      "command": ["python", "server.py"],
      "enabled": true
    }
  }
}
```

Adjust the `command` array to use absolute paths if needed (e.g., `["/path/to/venv/bin/python", "/path/to/server.py"]`).

### Option 2: HTTP/SSE (remote server)

Start the HTTP server first (`python server_http.py`), then add this to your `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "number-powers-http": {
      "type": "remote",
      "url": "http://localhost:8000/sse",
      "enabled": true
    }
  }
}
```

### Applying Changes

After saving `opencode.json`, **restart opencode** for the MCP server to be available.

## Available MCP Capabilities

| Server | Type | Tools | Resources | Prompts |
|--------|------|-------|-----------|---------|
| `server.py` | stdio | `calculate_powers(number)` | — | — |
| `server_http.py` | HTTP/SSE | `calculate_powers(number)`, `calculate_negative_powers(number)` | `numberpowers://info` | `powers_explanation(number)` |

### Tool Details

**`calculate_powers`** — Accepts a number, returns its square, cube, and 4th power as a comma-separated string.

**`calculate_negative_powers`** — Accepts a number, returns its negative powers (n^-1, n^-2, n^-3) as a comma-separated string. (HTTP server only)

**`numberpowers://info`** — Returns historical notes about number powers from ancient civilizations. (HTTP server only)

### Prompt Details

**`powers_explanation`** — Accepts a number and returns a prompt asking the LLM to calculate and explain all powers of that number (square, cube, 4th power, and negative powers). (HTTP server only)

## Invoking Prompts in OpenCode

OpenCode supports invoking MCP prompts through the chat interface. To use the `powers_explanation` prompt:

1. Start the HTTP server: `python server_http.py`
2. In OpenCode, mention the prompt in your message, for example:
   ```
   Use the powers_explanation prompt for number 22
   ```
3. OpenCode will call the MCP server's `prompts/get` endpoint with the prompt name and arguments.

Alternatively, you can manually invoke the prompt via the MCP protocol:

```json
{
  "method": "prompts/get",
  "params": {
    "name": "powers_explanation",
    "arguments": {
      "number": 22
    }
  }
}
```

## License

See [LICENSE](LICENSE).
