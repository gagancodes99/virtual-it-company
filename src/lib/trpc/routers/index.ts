import { createTRPCRouter } from "@/lib/trpc/server";
import { userRouter } from "./user";
import { projectRouter } from "./project";
import { agentRouter } from "./agent";
import { tenantRouter } from "./tenant";
import { taskRouter } from "./task";

export const appRouter = createTRPCRouter({
  user: userRouter,
  project: projectRouter,
  agent: agentRouter,
  tenant: tenantRouter,
  task: taskRouter,
});

export type AppRouter = typeof appRouter;