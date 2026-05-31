from mcp.server.fastmcp import FastMCP

mcp = FastMCP("NumberPowers")


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


if __name__ == "__main__":
    mcp.run(transport="stdio")
