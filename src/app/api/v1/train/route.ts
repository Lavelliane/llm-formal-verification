import { NextRequest, NextResponse } from "next/server";

async function POST(request: NextRequest) {
  const formData = await request.formData();
  const files = formData.get("files") as unknown as File[];
  console.log(files);
  return NextResponse.json({ message: "Files uploaded" }, { status: 200 });
}

export { POST };