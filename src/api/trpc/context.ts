import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/shared/auth/config";
import connectDB from "@/infrastructure/database/connection";

export async function createTRPCContext(opts: CreateNextContextOptions) {
  const { req, res } = opts;
  
  // Get session
  const session = await getServerSession(req, res, authOptions);
  
  // Connect to database
  await connectDB();

  return {
    session,
    req,
    res,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;