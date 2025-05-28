import mongoose, { Schema, Document } from 'mongoose';

export interface ITenant extends Document {
  name: string;
  domain: string;
  logo?: string;
  isActive: boolean;
  subscription: {
    plan: string;
    status: string;
    trialEnds?: Date;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  };
  settings: {
    allowAIAgents: boolean;
    maxProjects: number;
    maxUsers: number;
    features: string[];
  };
  billing: {
    address: {
      street: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
    taxId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TenantSchema = new Schema<ITenant>({
  name: { type: String, required: true },
  domain: { type: String, required: true, unique: true },
  logo: { type: String },
  isActive: { type: Boolean, default: true },
  subscription: {
    plan: { type: String, required: true, default: 'trial' },
    status: { type: String, required: true, default: 'active' },
    trialEnds: { type: Date },
    stripeCustomerId: { type: String },
    stripeSubscriptionId: { type: String }
  },
  settings: {
    allowAIAgents: { type: Boolean, default: true },
    maxProjects: { type: Number, default: 5 },
    maxUsers: { type: Number, default: 10 },
    features: [{ type: String }]
  },
  billing: {
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      postalCode: { type: String }
    },
    taxId: { type: String }
  }
}, {
  timestamps: true,
});

TenantSchema.index({ domain: 1 });

export default mongoose.models.Tenant || mongoose.model<ITenant>('Tenant', TenantSchema);