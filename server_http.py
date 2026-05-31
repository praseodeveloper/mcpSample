import uvicorn
from pathlib import Path
from mcp.server.fastmcp import FastMCP
from starlette.applications import Starlette
from starlette.routing import Mount, Route
from mcp.server.sse import SseServerTransport

mcp = FastMCP("NumberPowersHTTP")


@mcp.resource("numberpowers://info")
def read_number_powers() -> str:
    """Praseo's notes on number powers."""
    return (Path(__file__).parent / "numberPowers.txt").read_text()


@mcp.tool()
def calculate_powers(number: float) -> str:
    """Calculate the square, cube, and 4th power of a number.

    Args:
        number: The input number to calculate powers for.

    Returns:
        A comma-separated string containing square, cube, and 4th power.
    """
    square = number ** 2
    cube = number ** 3
    fourth_power = number ** 4
    return f"{square}, {cube}, {fourth_power}"


@mcp.tool()
def calculate_negative_powers(number: float) -> str:
    """Calculate the negative powers of a number (number^-1, number^-2, number^-3).

    Args:
        number: The input number to calculate negative powers for.

    Returns:
        A comma-separated string containing number^-1, number^-2, and number^-3.
    """
    neg1 = number ** -1
    neg2 = number ** -2
    neg3 = number ** -3
    return f"{neg1}, {neg2}, {neg3}"


@mcp.prompt()
def powers_explanation(number: float) -> str:
    """A prompt that explains the powers of a number."""
    return (
        f"Please calculate and explain the powers of the number {number}.\n"
        f"Include the square ({number}^2), cube ({number}^3), 4th power ({number}^4), "
        f"and negative powers ({number}^-1, {number}^-2, {number}^-3)."
    )


sse = SseServerTransport("/messages/")


async def handle_sse(request):
    async with sse.connect_sse(
        request.scope, request.receive, request._send
    ) as (read_stream, write_stream):
        await mcp._mcp_server.run(
            read_stream,
            write_stream,
            mcp._mcp_server.create_initialization_options(),
        )


app = Starlette(
    routes=[
        Route("/sse", endpoint=handle_sse),
        Mount("/messages/", app=sse.handle_post_message),
    ],
)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
