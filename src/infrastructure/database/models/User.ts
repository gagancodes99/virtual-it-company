import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '@/shared/types';

export interface IUser extends Document {
  email: string;
  name: string;
  password?: string;
  image?: string;
  role: UserRole;
  tenantId: string;
  isActive: boolean;
  lastLogin?: Date;
  profile: {
    bio?: string;
    skills: string[];
    hourlyRate?: number;
    timezone: string;
  };
  notifications: {
    email: boolean;
    push: boolean;
    slack: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String },
  image: { type: String },
  role: { 
    type: String, 
    enum: Object.values(UserRole), 
    required: true,
    default: UserRole.DEVELOPER
  },
  tenantId: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  profile: {
    bio: { type: String },
    skills: [{ type: String }],
    hourlyRate: { type: Number },
    timezone: { type: String, default: 'UTC' }
  },
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    slack: { type: Boolean, default: false }
  }
}, {
  timestamps: true,
});

UserSchema.index({ email: 1, tenantId: 1 });
UserSchema.index({ tenantId: 1, role: 1 });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);