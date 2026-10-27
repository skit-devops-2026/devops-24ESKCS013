import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IEventAttendance {
  eventName: string;
  eventDates: string;
  presentHours: number;
  absentHours: number;
  totalHours: number;
  remarks: string;
}

export interface IAttendanceOverview extends Document {
  userId: Types.ObjectId;
  erpAggregatePercentage: number | null;
  overallOdCount: number;
  eventAttendance: IEventAttendance | null;
  lastReportDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const eventAttendanceSchema = new Schema<IEventAttendance>(
  {
    eventName: { type: String, default: 'Techpravah 2026' },
    eventDates: { type: String, default: '12–15 October 2026' },
    presentHours: { type: Number, default: 8, min: 0 },
    absentHours: { type: Number, default: 16, min: 0 },
    totalHours: { type: Number, default: 24, min: 0 },
    remarks: {
      type: String,
      default:
        'Event hours are included in aggregate attendance but are not assigned to individual lectures, labs, or days.',
    },
  },
  { _id: false }
);

const attendanceOverviewSchema = new Schema<IAttendanceOverview>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true,
      index: true,
    },
    erpAggregatePercentage: {
      type: Number,
      min: [0, 'Aggregate percentage cannot be negative'],
      max: [100, 'Aggregate percentage cannot exceed 100'],
      default: 80.1,
    },
    overallOdCount: {
      type: Number,
      min: [0, 'Overall OD count cannot be negative'],
      default: 17,
    },
    eventAttendance: {
      type: eventAttendanceSchema,
      default: () => ({
        eventName: 'Techpravah 2026',
        eventDates: '12–15 October 2026',
        presentHours: 8,
        absentHours: 16,
        totalHours: 24,
        remarks:
          'Event hours are included in aggregate attendance but are not assigned to individual lectures, labs, or days.',
      }),
    },
    lastReportDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const AttendanceOverview =
  (mongoose.models.AttendanceOverview as mongoose.Model<IAttendanceOverview>) ||
  mongoose.model<IAttendanceOverview>('AttendanceOverview', attendanceOverviewSchema);
