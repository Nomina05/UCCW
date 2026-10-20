import { NextRequest, NextResponse } from "next/server";
import { createBackup } from "../../../../lib/backup-service";
export const maxDuration = 300;
export async function GET(request: NextRequest) { if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); try { return NextResponse.json(await createBackup("vercel-cron")); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Backup failed" }, { status: 500 }); } }
