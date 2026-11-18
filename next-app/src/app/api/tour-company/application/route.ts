import { NextResponse } from "next/server";
export async function POST(_request?: Request) {
  return NextResponse.json({ message: "Company accounts are created by platform administrators from the company page." }, { status: 403 });
}
