import { promises as fs } from "node:fs";
import path from "node:path";

import { put } from "@vercel/blob";
import { v4 as uuid } from "uuid";

import { hasBlobConfig } from "@/lib/config";
import { slugify } from "@/lib/utils";

const uploadDir = path.join(process.cwd(), "data", "uploads");

export async function storeUpload(file: File) {
  const extension = file.name.split(".").pop() || "bin";
  const fileName = `${slugify(file.name.replace(/\.[^.]+$/, "")) || "upload"}-${uuid()}.${extension}`;

  if (hasBlobConfig()) {
    const result = await put(fileName, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return {
      url: result.url,
      fileName,
      storage: "blob" as const,
    };
  }

  await fs.mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  const localPath = path.join(uploadDir, fileName);
  await fs.writeFile(localPath, buffer);

  return {
    url: `/api/uploads/${fileName}`,
    fileName,
    storage: "local" as const,
  };
}

export async function readLocalUpload(fileName: string) {
  const localPath = path.join(uploadDir, fileName);
  return fs.readFile(localPath);
}

