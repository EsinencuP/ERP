import { NextResponse, type NextRequest } from "next/server";

/** Resolve legacy browser favicon requests to the existing SVG app icon. */
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/icon.svg", request.url), 308);
}
