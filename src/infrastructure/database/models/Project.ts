import mongoose, { Schema, Document } from 'mongoose';
import { ProjectStatus, Priority } from '@/shared/types';

export interface IProject extends Document {
  name: string;
  description: string;
  status: ProjectStatus;
  priority: Priority;
  budget: number;
  deadline?: Date;
  clientId: string;
  tenantId: string;
  teamMembers: string[];
  assignedAgents: string[];
  progress: number;
  tags: string[];
  repository?: {
    url: string;
    branch: string;
    accessToken?: string;
  };
  deployment?: {
    url: string;
    environment: string;
    lastDeployed?: Date;
  };
  client: {
    name: string;
    email: string;
    company?: string;
    phone?: string;
  };
  requirements: {
    functional: string[];
    technical: string[];
    designSpecs?: string;
  };
  milestones: [{
    name: string;
    description: string;
    dueDate: Date;
    status: string;
    payment?: number;
  }];
  files: [{
    name: string;
    url: string;
    type: string;
    uploadedBy: string;
    uploadedAt: Date;
  }];
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>({
  name: { type: String, required: true },
  description: { type: String, required: true },
  status: { 
    type: String, 
    enum: Object.values(ProjectStatus), 
    default: ProjectStatus.DRAFT 
  },
  priority: { 
    type: String, 
    enum: Object.values(Priority), 
    default: Priority.MEDIUM 
  },
  budget: { type: Number, required: true },
  deadline: { type: Date },
  clientId: { type: String, required: true },
  tenantId: { type: String, required: true },
  teamMembers: [{ type: String }],
  assignedAgents: [{ type: String }],
  progress: { type: Number, default: 0, min: 0, max: 100 },
  tags: [{ type: String }],
  repository: {
    url: { type: String },
    branch: { type: String, default: 'main' },
    accessToken: { type: String }
  },
  deployment: {
    url: { type: String },
    environment: { type: String },
    lastDeployed: { type: Date }
  },
  client: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    company: { type: String },
    phone: { type: String }
  },
  requirements: {
    functional: [{ type: String }],
    technical: [{ type: String }],
    designSpecs: { type: String }
  },
  milestones: [{
    name: { type: String, required: true },
    description: { type: String },
    dueDate: { type: Date, required: true },
    status: { type: String, default: 'pending' },
    payment: { type: Number }
  }],
  files: [{
    name: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, required: true },
    uploadedBy: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true,
});

ProjectSchema.index({ tenantId: 1, status: 1 });
ProjectSchema.index({ clientId: 1 });
ProjectSchema.index({ teamMembers: 1 });

export default mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);