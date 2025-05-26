import { z } from "zod";
import { createTRPCRouter, tenantProcedure, adminProcedure } from "@/lib/trpc/server";
import AIAgent from "@/lib/database/models/AIAgent";
import { AgentStatus } from "@/types";
import { TRPCError } from "@trpc/server";

const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.string().min(1),
  description: z.string().min(1),
  skills: z.array(z.string()),
  avatar: z.string().optional(),
  model: z.object({
    provider: z.enum(["openai", "anthropic", "custom"]),
    model: z.string(),
    temperature: z.number().min(0).max(2),
    maxTokens: z.number().min(100).max(8000),
  }),
  capabilities: z.object({
    languages: z.array(z.string()),
    frameworks: z.array(z.string()),
    specializations: z.array(z.string()),
    tools: z.array(z.string()),
  }),
  settings: z.object({
    workingHours: z.object({
      start: z.string(),
      end: z.string(),
      timezone: z.string(),
    }),
    responseTime: z.number().min(1),
    maxConcurrentTasks: z.number().min(1).max(10),
    autoAssign: z.boolean(),
  }),
});

const updateAgentSchema = createAgentSchema.partial().extend({
  id: z.string(),
});

export const agentRouter = createTRPCRouter({
  // Get all agents for tenant
  getAll: tenantProcedure.query(async ({ ctx }) => {
    try {
      const agents = await AIAgent.find({ tenantId: ctx.tenantId }).sort({ createdAt: -1 });
      return agents;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch agents",
      });
    }
  }),

  // Get agent by ID
  getById: tenantProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const agent = await AIAgent.findOne({ _id: input.id, tenantId: ctx.tenantId });
        
        if (!agent) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Agent not found",
          });
        }

        return agent;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch agent",
        });
      }
    }),

  // Create new agent (admin only)
  create: adminProcedure
    .input(createAgentSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const agent = await AIAgent.create({
          ...input,
          tenantId: ctx.tenantId,
          status: AgentStatus.TRAINING,
        });

        return agent;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create agent",
        });
      }
    }),

  // Update agent
  update: adminProcedure
    .input(updateAgentSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const { id, ...updateData } = input;
        
        const agent = await AIAgent.findOneAndUpdate(
          { _id: id, tenantId: ctx.tenantId },
          updateData,
          { new: true }
        );

        if (!agent) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Agent not found",
          });
        }

        return agent;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update agent",
        });
      }
    }),

  // Delete agent
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const agent = await AIAgent.findOneAndDelete({ 
          _id: input.id, 
          tenantId: ctx.tenantId 
        });

        if (!agent) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Agent not found",
          });
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete agent",
        });
      }
    }),

  // Update agent status
  updateStatus: adminProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum([AgentStatus.ACTIVE, AgentStatus.INACTIVE, AgentStatus.TRAINING, AgentStatus.MAINTENANCE]),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const agent = await AIAgent.findOneAndUpdate(
          { _id: input.id, tenantId: ctx.tenantId },
          { status: input.status },
          { new: true }
        );

        if (!agent) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Agent not found",
          });
        }

        return agent;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update agent status",
        });
      }
    }),

  // Get agents by type and skills (for task assignment)
  getAvailable: tenantProcedure
    .input(z.object({
      type: z.string().optional(),
      skills: z.array(z.string()).optional(),
      excludeIds: z.array(z.string()).optional(),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const query: any = {
          tenantId: ctx.tenantId,
          status: AgentStatus.ACTIVE,
        };

        if (input.type) {
          query.type = input.type;
        }

        if (input.skills && input.skills.length > 0) {
          query.skills = { $in: input.skills };
        }

        if (input.excludeIds && input.excludeIds.length > 0) {
          query._id = { $nin: input.excludeIds };
        }

        const agents = await AIAgent.find(query)
          .sort({ 'performance.averageRating': -1 })
          .limit(10);

        return agents;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch available agents",
        });
      }
    }),

  // Update agent performance metrics
  updatePerformance: tenantProcedure
    .input(z.object({
      id: z.string(),
      tasksCompleted: z.number().optional(),
      rating: z.number().min(1).max(5).optional(),
      responseTime: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { id, rating, ...otherUpdates } = input;
        
        const agent = await AIAgent.findOne({ _id: id, tenantId: ctx.tenantId });
        
        if (!agent) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Agent not found",
          });
        }

        const updates: any = { ...otherUpdates };

        // Update average rating if new rating provided
        if (rating) {
          const currentRating = agent.performance.averageRating;
          const completedTasks = agent.performance.tasksCompleted;
          
          if (completedTasks === 0) {
            updates['performance.averageRating'] = rating;
          } else {
            const newAverage = ((currentRating * completedTasks) + rating) / (completedTasks + 1);
            updates['performance.averageRating'] = Math.round(newAverage * 100) / 100;
          }
        }

        // Increment tasks completed
        if (input.tasksCompleted !== undefined) {
          updates['performance.tasksCompleted'] = agent.performance.tasksCompleted + 1;
        }

        // Update last active
        updates['performance.lastActive'] = new Date();

        const updatedAgent = await AIAgent.findByIdAndUpdate(
          id,
          { $set: updates },
          { new: true }
        );

        return updatedAgent;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update agent performance",
        });
      }
    }),
});