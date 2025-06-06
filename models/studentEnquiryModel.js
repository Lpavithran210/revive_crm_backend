import mongoose from 'mongoose';

const studentEnquirySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  course: {
    type: String,
    required: true,
    trim: true,
  },
  are_you: {
    type: String,
    enum: ['Fresher', 'Experienced'],
    required: true,
  },
  currently_working_in: {
    type: String,
    enum: ['IT', 'Non IT'],
  },
  learning_mode: {
    type: String,
    enum: ['Online', 'Offline'],
    required: true,
  },
  source: {
    type: String,
    enum: ['Meta', 'Instagram', 'Website', 'Referral', 'Direct'],
    required: true,
    default: 'Instagram'
  },
  status: {
    type: String,
    enum: ['Pending', 'Follow up', 'Loss', 'Success'],
    default: 'Pending'
  },
  attender: {
    type: String,
    default: undefined
  },
  history: [
    {
      updated_at: { type: Date, default: Date.now },
      status: { type: String, enum: ['Pending', 'Follow up', 'Loss', 'Success'] },
      attender: { type: String },
      note: { type: String, trim: true },
      follow_up_date: { type: Date },
      reminder_sent: { type: Boolean, default: false }
    }
  ],
  payments: [
    {
      paid_amount: { type: Number, required: true },
      payment_mode: { type: String, enum: ['Cash', 'UPI', 'Card', 'Bank Transfer'], required: true },
      payment_date: { type: Date, default: Date.now }
    }
  ],
  balance_amount: { type: Number },
  next_due_date: { type: Date },
  payment_status: {
    type: String,
    enum: ['Unpaid', 'Partially Paid', 'Fully Paid'],
    default: 'Unpaid'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

studentEnquirySchema.index({ updated_at: 1 });
studentEnquirySchema.index({ "history.updated_at": 1 });
studentEnquirySchema.index({ "history.follow_up_date": 1 });

const StudentEnquiry = mongoose.model('StudentEnquiry', studentEnquirySchema);

export default StudentEnquiry;
