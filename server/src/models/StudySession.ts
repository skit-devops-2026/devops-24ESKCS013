import mongoose, { Schema, Document, Types } from 'mongoose';

export type StudySessionStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export interface IStudySession extends Document {
  userId: Types.ObjectId;
  subjectId?: Types.ObjectId | null;
  subjectCode?: string;
  title: string;
  status: StudySessionStatus;
  startTime: Date;
  endTime?: Date;
  lastPauseTime?: Date;
  pausedSeconds: number;
  durationSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

const studySessionSchema = new Schema<IStudySession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
    },
    subjectCode: {
      type: String,
      trim: true,
      default: '',
    },
    title: {
      type: String,
      trim: true,
      default: 'Focused Study Session',
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'paused', 'completed', 'cancelled'],
        message: '{VALUE} is not a valid study session status',
      },
      default: 'active',
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    lastPauseTime: {
      type: Date,
    },
    pausedSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    durationSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

studySessionSchema.index({ userId: 1, status: 1 });

export const StudySession =
  (mongoose.models.StudySession as mongoose.Model<IStudySession>) ||
  mongoose.model<IStudySession>('StudySession', studySessionSchema);
