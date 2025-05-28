import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";
import User from "@/infrastructure/database/models/User";
import Tenant from "@/infrastructure/database/models/Tenant";
import connectDB from "@/infrastructure/database/connection";

const client = new MongoClient(process.env.MONGODB_URI!);

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(client),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        tenantDomain: { label: "Company Domain", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        await connectDB();

        // Find tenant by domain
        const tenant = await Tenant.findOne({ 
          domain: credentials.tenantDomain?.toLowerCase(),
          isActive: true 
        });

        if (!tenant) {
          throw new Error("Company not found or inactive");
        }

        // Find user
        const user = await User.findOne({ 
          email: credentials.email.toLowerCase(),
          tenantId: tenant._id.toString(),
          isActive: true
        });

        if (!user) {
          throw new Error("Invalid credentials");
        }

        // For OAuth users, password might not be set
        if (user.password) {
          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) {
            throw new Error("Invalid credentials");
          }
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          tenantId: user.tenantId,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        await connectDB();
        
        // Handle OAuth sign-in
        if (account.provider !== "credentials") {
          // Try to find existing user or create new one
          let dbUser = await User.findOne({ email: user.email?.toLowerCase() });
          
          if (!dbUser) {
            // For new OAuth users, we need to determine their tenant
            // This could be done through domain extraction or a signup flow
            const defaultTenant = await Tenant.findOne({ domain: "default" });
            
            if (defaultTenant) {
              dbUser = await User.create({
                email: user.email?.toLowerCase(),
                name: user.name,
                image: user.image,
                tenantId: defaultTenant._id.toString(),
                role: "DEVELOPER", // Default role
              });
            }
          }
          
          if (dbUser) {
            token.role = dbUser.role;
            token.tenantId = dbUser.tenantId;
            
            // Update last login
            await User.findByIdAndUpdate(dbUser._id, { lastLogin: new Date() });
          }
        } else {
          // Credentials login
          token.role = user.role;
          token.tenantId = user.tenantId;
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.tenantId = token.tenantId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    signUp: "/auth/signup",
    error: "/auth/error",
  },
  events: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== "credentials") {
        await connectDB();
        await User.findOneAndUpdate(
          { email: user.email?.toLowerCase() },
          { lastLogin: new Date() }
        );
      }
    },
  },
};

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      role: string;
      tenantId: string;
    };
  }

  interface User {
    role?: string;
    tenantId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    tenantId?: string;
  }
}