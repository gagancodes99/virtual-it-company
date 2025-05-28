import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/api/trpc/routers";
import { createTRPCContext } from "@/api/trpc/context";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ req, res: undefined as any }),
  });

export { handler as GET, handler as POST };