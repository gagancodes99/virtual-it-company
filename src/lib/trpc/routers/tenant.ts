import { z } from "zod";
import { createTRPCRouter, superAdminProcedure, adminProcedure } from "@/lib/trpc/server";
import Tenant from "@/lib/database/models/Tenant";
import { TRPCError } from "@trpc/server";

export const tenantRouter = createTRPCRouter({
  // Get all tenants (super admin only)
  getAll: superAdminProcedure.query(async () => {
    try {
      const tenants = await Tenant.find().sort({ createdAt: -1 });
      return tenants;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch tenants",
      });
    }
  }),

  // Get current tenant
  getCurrent: adminProcedure.query(async ({ ctx }) => {
    try {
      const tenant = await Tenant.findById(ctx.tenantId);
      
      if (!tenant) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tenant not found",
        });
      }

      return tenant;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch tenant",
      });
    }
  }),

  // Create tenant (super admin only)
  create: superAdminProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      domain: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
      plan: z.string().default("trial"),
    }))
    .mutation(async ({ input }) => {
      try {
        const existingTenant = await Tenant.findOne({ domain: input.domain });
        
        if (existingTenant) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Domain already exists",
          });
        }

        const tenant = await Tenant.create({
          ...input,
          subscription: {
            plan: input.plan,
            status: "active",
            trialEnds: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
          },
          settings: {
            allowAIAgents: true,
            maxProjects: input.plan === "trial" ? 3 : 10,
            maxUsers: input.plan === "trial" ? 5 : 25,
            features: ["basic"],
          },
        });

        return tenant;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create tenant",
        });
      }
    }),

  // Update tenant settings
  updateSettings: adminProcedure
    .input(z.object({
      allowAIAgents: z.boolean().optional(),
      features: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const updateData: any = {};
        
        if (input.allowAIAgents !== undefined) {
          updateData['settings.allowAIAgents'] = input.allowAIAgents;
        }
        
        if (input.features) {
          updateData['settings.features'] = input.features;
        }

        const tenant = await Tenant.findByIdAndUpdate(
          ctx.tenantId,
          { $set: updateData },
          { new: true }
        );

        return tenant;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update tenant settings",
        });
      }
    }),

  // Update billing info
  updateBilling: adminProcedure
    .input(z.object({
      address: z.object({
        street: z.string(),
        city: z.string(),
        state: z.string(),
        country: z.string(),
        postalCode: z.string(),
      }).optional(),
      taxId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const updateData: any = {};
        
        if (input.address) {
          updateData.billing = { ...input };
        }

        const tenant = await Tenant.findByIdAndUpdate(
          ctx.tenantId,
          { $set: updateData },
          { new: true }
        );

        return tenant;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update billing information",
        });
      }
    }),

  // Deactivate tenant (super admin only)
  deactivate: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const tenant = await Tenant.findByIdAndUpdate(
          input.id,
          { isActive: false },
          { new: true }
        );

        if (!tenant) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Tenant not found",
          });
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to deactivate tenant",
        });
      }
    }),
});