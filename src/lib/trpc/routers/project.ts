import { z } from "zod";
import { createTRPCRouter, tenantProcedure, adminProcedure } from "@/lib/trpc/server";
import Project from "@/lib/database/models/Project";
import { ProjectStatus, Priority } from "@/types";
import { TRPCError } from "@trpc/server";

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1),
  budget: z.number().min(0),
  deadline: z.date().optional(),
  priority: z.enum([Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.URGENT]),
  client: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    company: z.string().optional(),
    phone: z.string().optional(),
  }),
  requirements: z.object({
    functional: z.array(z.string()),
    technical: z.array(z.string()),
    designSpecs: z.string().optional(),
  }),
  tags: z.array(z.string()).optional(),
});

export const projectRouter = createTRPCRouter({
  // Get all projects for tenant
  getAll: tenantProcedure
    .input(z.object({
      status: z.enum([ProjectStatus.DRAFT, ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED]).optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      try {
        const query: any = { tenantId: ctx.tenantId };
        
        if (input.status) {
          query.status = input.status;
        }

        const projects = await Project.find(query)
          .sort({ updatedAt: -1 })
          .limit(input.limit)
          .skip(input.offset);

        const total = await Project.countDocuments(query);

        return { projects, total };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch projects",
        });
      }
    }),

  // Get project by ID
  getById: tenantProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      try {
        const project = await Project.findOne({ 
          _id: input.id, 
          tenantId: ctx.tenantId 
        });

        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        return project;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch project",
        });
      }
    }),

  // Create new project
  create: adminProcedure
    .input(createProjectSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        const project = await Project.create({
          ...input,
          tenantId: ctx.tenantId,
          clientId: `client_${Date.now()}`, // Generate client ID
          status: ProjectStatus.DRAFT,
          progress: 0,
          teamMembers: [],
          assignedAgents: [],
        });

        return project;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create project",
        });
      }
    }),

  // Update project
  update: adminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).max(200).optional(),
      description: z.string().min(1).optional(),
      budget: z.number().min(0).optional(),
      deadline: z.date().optional(),
      priority: z.enum([Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.URGENT]).optional(),
      status: z.enum([ProjectStatus.DRAFT, ProjectStatus.ACTIVE, ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED, ProjectStatus.CANCELLED]).optional(),
      progress: z.number().min(0).max(100).optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { id, ...updateData } = input;
        
        const project = await Project.findOneAndUpdate(
          { _id: id, tenantId: ctx.tenantId },
          updateData,
          { new: true }
        );

        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        return project;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update project",
        });
      }
    }),

  // Assign team members
  assignTeamMembers: adminProcedure
    .input(z.object({
      projectId: z.string(),
      userIds: z.array(z.string()),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const project = await Project.findOneAndUpdate(
          { _id: input.projectId, tenantId: ctx.tenantId },
          { teamMembers: input.userIds },
          { new: true }
        );

        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        return project;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to assign team members",
        });
      }
    }),

  // Assign AI agents
  assignAgents: adminProcedure
    .input(z.object({
      projectId: z.string(),
      agentIds: z.array(z.string()),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const project = await Project.findOneAndUpdate(
          { _id: input.projectId, tenantId: ctx.tenantId },
          { assignedAgents: input.agentIds },
          { new: true }
        );

        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        return project;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to assign agents",
        });
      }
    }),

  // Delete project
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const project = await Project.findOneAndDelete({ 
          _id: input.id, 
          tenantId: ctx.tenantId 
        });

        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete project",
        });
      }
    }),

  // Get projects for current user
  getMyProjects: tenantProcedure.query(async ({ ctx }) => {
    try {
      const projects = await Project.find({
        tenantId: ctx.tenantId,
        $or: [
          { teamMembers: ctx.session.user.id },
          { clientId: ctx.session.user.id }, // If user is a client
        ]
      }).sort({ updatedAt: -1 });

      return projects;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch user projects",
      });
    }
  }),

  // Get project statistics
  getStats: tenantProcedure.query(async ({ ctx }) => {
    try {
      const stats = await Project.aggregate([
        { $match: { tenantId: ctx.tenantId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalBudget: { $sum: "$budget" },
            avgProgress: { $avg: "$progress" }
          }
        }
      ]);

      const totalProjects = await Project.countDocuments({ tenantId: ctx.tenantId });

      return { stats, totalProjects };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch project statistics",
      });
    }
  }),
});