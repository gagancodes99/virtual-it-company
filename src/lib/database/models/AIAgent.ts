import mongoose, { Schema, Document } from 'mongoose';
import { AgentStatus } from '@/types';

export interface IAIAgent extends Document {
  name: string;
  type: string;
  avatar?: string;
  description: string;
  skills: string[];
  status: AgentStatus;
  tenantId: string;
  model: {
    provider: string; // 'openai', 'anthropic', 'custom'
    model: string; // 'gpt-4', 'claude-3', etc.
    temperature: number;
    maxTokens: number;
  };
  performance: {
    tasksCompleted: number;
    averageRating: number;
    reliability: number;
    responseTimeMs: number;
    lastActive?: Date;
  };
  capabilities: {
    languages: string[];
    frameworks: string[];
    specializations: string[];
    tools: string[];
  };
  settings: {
    workingHours: {
      start: string;
      end: string;
      timezone: string;
    };
    responseTime: number;
    maxConcurrentTasks: number;
    autoAssign: boolean;
  };
  training: {
    datasets: string[];
    lastTrained?: Date;
    accuracy: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AIAgentSchema = new Schema<IAIAgent>({
  name: { type: String, required: true },
  type: { type: String, required: true }, // 'developer', 'designer', 'tester', 'pm'
  avatar: { type: String },
  description: { type: String, required: true },
  skills: [{ type: String }],
  status: { 
    type: String, 
    enum: Object.values(AgentStatus), 
    default: AgentStatus.TRAINING 
  },
  tenantId: { type: String, required: true },
  model: {
    provider: { type: String, required: true, default: 'openai' },
    model: { type: String, required: true, default: 'gpt-4' },
    temperature: { type: Number, default: 0.7 },
    maxTokens: { type: Number, default: 2000 }
  },
  performance: {
    tasksCompleted: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    reliability: { type: Number, default: 0 },
    responseTimeMs: { type: Number, default: 0 },
    lastActive: { type: Date }
  },
  capabilities: {
    languages: [{ type: String }],
    frameworks: [{ type: String }],
    specializations: [{ type: String }],
    tools: [{ type: String }]
  },
  settings: {
    workingHours: {
      start: { type: String, default: '09:00' },
      end: { type: String, default: '17:00' },
      timezone: { type: String, default: 'UTC' }
    },
    responseTime: { type: Number, default: 300 }, // seconds
    maxConcurrentTasks: { type: Number, default: 3 },
    autoAssign: { type: Boolean, default: false }
  },
  training: {
    datasets: [{ type: String }],
    lastTrained: { type: Date },
    accuracy: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
});

AIAgentSchema.index({ tenantId: 1, status: 1 });
AIAgentSchema.index({ type: 1, skills: 1 });

export default mongoose.models.AIAgent || mongoose.model<IAIAgent>('AIAgent', AIAgentSchema);