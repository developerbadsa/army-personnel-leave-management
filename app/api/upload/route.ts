import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/rbac";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await authenticateRequest();
    if (errorResponse) return errorResponse;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let fileUrl = "";

    // 1. Attempt local disk storage (for self-hosted Node.js / VPS)
    try {
      const uploadsDir = join(process.cwd(), "public", "uploads");
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }

      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const uniqueFileName = `${timestamp}_${sanitizedName}`;
      const filePath = join(uploadsDir, uniqueFileName);

      await writeFile(filePath, buffer);
      fileUrl = `/uploads/${uniqueFileName}`;
    } catch (fsError) {
      // 2. Fallback to Data URL for serverless / read-only filesystem (e.g. Vercel)
      console.warn("Local disk write failed, fallback to Data URL:", fsError);
      const mimeType = file.type || "application/octet-stream";
      const base64Data = buffer.toString("base64");
      fileUrl = `data:${mimeType};base64,${base64Data}`;
    }

    return NextResponse.json({
      success: true,
      data: {
        fileUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
      },
    });
  } catch (error: unknown) {
    console.error("Upload API Error:", error);
    const msg = error instanceof Error ? error.message : "Failed to upload file";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
