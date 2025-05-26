import { z } from "zod";
import { createTRPCRouter, protectedProcedure, tenantProcedure, adminProcedure } from "@/lib/trpc/server";
import User from "@/lib/database/models/User";
import { UserRole } from "@/types";
import { TRPCError } from "@trpc/server";

export const userRouter = createTRPCRouter({
  // Get current user profile
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    try {
      const user = await User.findById(ctx.session.user.id);
      
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return user;
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch user profile",
      });
    }
  }),

  // Update user profile
  updateProfile: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100).optional(),
      bio: z.string().max(500).optional(),
      skills: z.array(z.string()).optional(),
      hourlyRate: z.number().min(0).optional(),
      timezone: z.string().optional(),
      notifications: z.object({
        email: z.boolean(),
        push: z.boolean(),
        slack: z.boolean(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const updateData: any = {};
        
        if (input.name) updateData.name = input.name;
        if (input.bio !== undefined) updateData['profile.bio'] = input.bio;
        if (input.skills) updateData['profile.skills'] = input.skills;
        if (input.hourlyRate !== undefined) updateData['profile.hourlyRate'] = input.hourlyRate;
        if (input.timezone) updateData['profile.timezone'] = input.timezone;
        if (input.notifications) updateData.notifications = input.notifications;

        const user = await User.findByIdAndUpdate(
          ctx.session.user.id,
          { $set: updateData },
          { new: true }
        );

        return user;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update profile",
        });
      }
    }),

  // Get all users in tenant (admin only)
  getAllInTenant: adminProcedure.query(async ({ ctx }) => {
    try {
      const users = await User.find({ tenantId: ctx.tenantId })
        .select('-password')
        .sort({ createdAt: -1 });

      return users;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch users",
      });
    }
  }),

  // Get team members for a tenant
  getTeamMembers: tenantProcedure.query(async ({ ctx }) => {
    try {
      const users = await User.find({ 
        tenantId: ctx.tenantId,
        isActive: true,
        role: { $in: [UserRole.DEVELOPER, UserRole.DESIGNER, UserRole.PROJECT_MANAGER] }
      })
        .select('name email image role profile.skills')
        .sort({ name: 1 });

      return users;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch team members",
      });
    }
  }),

  // Update user role (admin only)
  updateRole: adminProcedure
    .input(z.object({
      userId: z.string(),
      role: z.enum([
        UserRole.TENANT_ADMIN,
        UserRole.PROJECT_MANAGER,
        UserRole.DEVELOPER,
        UserRole.DESIGNER,
        UserRole.CLIENT,
      ]),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const user = await User.findOneAndUpdate(
          { 
            _id: input.userId, 
            tenantId: ctx.tenantId,
            _id: { $ne: ctx.session.user.id } // Prevent self role change
          },
          { role: input.role },
          { new: true }
        );

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found or cannot update own role",
          });
        }

        return user;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update user role",
        });
      }
    }),

  // Deactivate user (admin only)
  deactivate: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const user = await User.findOneAndUpdate(
          { 
            _id: input.userId, 
            tenantId: ctx.tenantId,
            _id: { $ne: ctx.session.user.id } // Prevent self deactivation
          },
          { isActive: false },
          { new: true }
        );

        if (!user) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found or cannot deactivate yourself",
          });
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to deactivate user",
        });
      }
    }),

  // Get user dashboard stats
  getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      // This would be expanded with actual project and task counts
      const user = await User.findById(ctx.session.user.id);
      
      // Placeholder stats - would be calculated from related collections
      const stats = {
        activeProjects: 0,
        completedTasks: 0,
        hoursThisWeek: 0,
        upcomingDeadlines: 0,
      };

      return { user, stats };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch dashboard stats",
      });
    }
  }),
});