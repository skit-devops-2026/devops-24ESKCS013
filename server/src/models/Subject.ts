import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISubject extends Document {
  userId: Types.ObjectId;
  code: string;
  name: string;
  credits: number;
  semester: number;
  facultyName: string;
  attendancePercentage: number;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

const subjectSchema = new Schema<ISubject>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    code: {
      type: String,
      required: [true, 'Subject code is required'],
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
    },
    credits: {
      type: Number,
      required: true,
      min: [1, 'Credits must be at least 1'],
      max: [10, 'Credits cannot exceed 10'],
      default: 3,
    },
    semester: {
      type: Number,
      required: true,
      min: [1, 'Semester must be between 1 and 8'],
      max: [8, 'Semester must be between 1 and 8'],
      default: 1,
    },
    facultyName: {
      type: String,
      trim: true,
      default: '',
    },
    attendancePercentage: {
      type: Number,
      default: 85,
      min: [0, 'Attendance cannot be negative'],
      max: [100, 'Attendance cannot exceed 100%'],
    },
    color: {
      type: String,
      default: '#D69A2D',
    },
  },
  {
    timestamps: true,
  }
);

// Enforce unique subject code per user
subjectSchema.index({ userId: 1, code: 1 }, { unique: true });

export const Subject =
  (mongoose.models.Subject as mongoose.Model<ISubject>) ||
  mongoose.model<ISubject>('Subject', subjectSchema);
