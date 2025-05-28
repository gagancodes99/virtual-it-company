import { createTRPCReact } from "@trpc/react-query";
import { type AppRouter } from "@/api/trpc/routers";

export const trpc = createTRPCReact<AppRouter>();