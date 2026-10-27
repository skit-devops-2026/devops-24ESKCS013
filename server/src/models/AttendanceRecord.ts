import mongoose, { Schema, Document, Types } from 'mongoose';
import { AttendancePolicy } from '../services/attendance-calc.service.js';

export interface IAttendanceRecord extends Document {
  userId: Types.ObjectId;
  subjectCode: string;
  subjectName: string;
  subjectType: string;
  subjectId: Types.ObjectId | null;
  present: number;
  od: number;
  makeup: number;
  absent: number;
  totalConducted: number;
  totalAttended: number;
  erpPercentage: number;
  calculatedPercentage: number;
  policyUsed: AttendancePolicy;
  threshold: number;
  discrepancyNote?: string | null;
  lastImportedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const attendanceRecordSchema = new Schema<IAttendanceRecord>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    subjectCode: {
      type: String,
      required: [true, 'Subject code is required'],
      trim: true,
      uppercase: true,
    },
    subjectName: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
    },
    subjectType: {
      type: String,
      trim: true,
      default: 'Lecture',
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
      index: true,
    },
    present: {
      type: Number,
      required: true,
      min: [0, 'Present count cannot be negative'],
      default: 0,
    },
    od: {
      type: Number,
      required: true,
      min: [0, 'OD count cannot be negative'],
      default: 0,
    },
    makeup: {
      type: Number,
      required: true,
      min: [0, 'Makeup count cannot be negative'],
      default: 0,
    },
    absent: {
      type: Number,
      required: true,
      min: [0, 'Absent count cannot be negative'],
      default: 0,
    },
    totalConducted: {
      type: Number,
      required: true,
      min: [0, 'Total conducted classes cannot be negative'],
      default: 0,
    },
    totalAttended: {
      type: Number,
      required: true,
      min: [0, 'Total attended classes cannot be negative'],
      default: 0,
    },
    erpPercentage: {
      type: Number,
      required: true,
      min: [0, 'ERP percentage must be between 0 and 100'],
      max: [100, 'ERP percentage must be between 0 and 100'],
      default: 0,
    },
    calculatedPercentage: {
      type: Number,
      required: true,
      min: [0, 'Calculated percentage must be between 0 and 100'],
      max: [100, 'Calculated percentage must be between 0 and 100'],
      default: 0,
    },
    policyUsed: {
      type: String,
      enum: ['standard_od', 'makeup_compensatory', 'strict_present', 'erp_direct'],
      default: 'standard_od',
    },
    threshold: {
      type: Number,
      min: [1, 'Threshold must be at least 1%'],
      max: [100, 'Threshold cannot exceed 100%'],
      default: 75,
    },
    discrepancyNote: {
      type: String,
      default: null,
    },
    lastImportedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce unique subject code per student for repeatable imports
attendanceRecordSchema.index({ userId: 1, subjectCode: 1 }, { unique: true });
attendanceRecordSchema.index({ userId: 1, calculatedPercentage: 1 });

export const AttendanceRecord =
  (mongoose.models.AttendanceRecord as mongoose.Model<IAttendanceRecord>) ||
  mongoose.model<IAttendanceRecord>('AttendanceRecord', attendanceRecordSchema);
