import mongoose, { Schema, Document, Types } from 'mongoose';

export type AnnouncementPriority = 'normal' | 'urgent';
export type AnnouncementAudience = 'all' | 'students' | 'faculty';
export type AnnouncementStatus = 'draft' | 'published';

export interface IAnnouncement extends Document {
  title: string;
  content: string;
  priority: AnnouncementPriority;
  targetAudience: AnnouncementAudience;
  status: AnnouncementStatus;
  authorId: Types.ObjectId;
  publishedAt: Date;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const announcementSchema = new Schema<IAnnouncement>(
  {
    title: {
      type: String,
      required: [true, 'Announcement title is required'],
      trim: true,
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'Announcement content is required'],
      trim: true,
      minlength: [5, 'Content must be at least 5 characters'],
      maxlength: [5000, 'Content cannot exceed 5000 characters'],
    },
    priority: {
      type: String,
      enum: ['normal', 'urgent'],
      default: 'normal',
      index: true,
    },
    targetAudience: {
      type: String,
      enum: ['all', 'students', 'faculty'],
      default: 'all',
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'published',
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

announcementSchema.index({ status: 1, publishedAt: -1 });

export const Announcement =
  mongoose.models.Announcement || mongoose.model<IAnnouncement>('Announcement', announcementSchema);
