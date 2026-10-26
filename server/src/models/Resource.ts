import mongoose, { Schema, Document, Types } from 'mongoose';

export type ResourceType = 'notes' | 'syllabus' | 'question_paper' | 'lab_manual' | 'reference';
export type ResourceStatus = 'draft' | 'published';

export interface IResource extends Document {
  title: string;
  description: string;
  resourceType: ResourceType;
  url: string;
  subjectId: Types.ObjectId | null;
  department: string | null;
  semester: number | null;
  status: ResourceStatus;
  uploadedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const resourceSchema = new Schema<IResource>(
  {
    title: {
      type: String,
      required: [true, 'Resource title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Resource description is required'],
      trim: true,
      minlength: [5, 'Description must be at least 5 characters'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    resourceType: {
      type: String,
      enum: ['notes', 'syllabus', 'question_paper', 'lab_manual', 'reference'],
      required: [true, 'Resource type is required'],
      index: true,
    },
    url: {
      type: String,
      required: [true, 'Resource URL is required'],
      trim: true,
      match: [/^https?:\/\/.+/i, 'URL must begin with http:// or https://'],
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
      index: true,
    },
    department: {
      type: String,
      default: null,
      trim: true,
    },
    semester: {
      type: Number,
      default: null,
      min: 1,
      max: 8,
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'published',
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

resourceSchema.index({ status: 1, resourceType: 1 });
resourceSchema.index({ title: 'text', description: 'text' });

export const Resource =
  mongoose.models.Resource || mongoose.model<IResource>('Resource', resourceSchema);
