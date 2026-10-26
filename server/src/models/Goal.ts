import mongoose, { Schema, Document, Types } from 'mongoose';

export type GoalStatus = 'active' | 'completed' | 'abandoned';

export interface IGoal extends Document {
  userId: Types.ObjectId;
  title: string;
  description: string;
  targetDate: Date;
  targetValue: number;
  currentValue: number;
  unit: string;
  category: string;
  status: GoalStatus;
  createdAt: Date;
  updatedAt: Date;
}

const goalSchema = new Schema<IGoal>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
      minlength: [1, 'Title cannot be empty'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    targetDate: {
      type: Date,
      required: [true, 'Target date is required'],
      index: true,
    },
    targetValue: {
      type: Number,
      required: true,
      min: [1, 'Target value must be at least 1'],
      default: 100,
    },
    currentValue: {
      type: Number,
      default: 0,
      min: [0, 'Current value cannot be negative'],
    },
    unit: {
      type: String,
      default: '%',
      trim: true,
    },
    category: {
      type: String,
      default: 'Academic',
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'completed', 'abandoned'],
        message: '{VALUE} is not a valid goal status',
      },
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

goalSchema.index({ userId: 1, status: 1 });

export const Goal =
  (mongoose.models.Goal as mongoose.Model<IGoal>) ||
  mongoose.model<IGoal>('Goal', goalSchema);
