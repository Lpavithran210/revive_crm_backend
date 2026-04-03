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
    unique: true
  },
  qualification: {
    type: String,
    trim: true
  },
  course: {
    type: String,
    required: true,
    trim: true,
  },
  city: {
    type: String,
    trim: true
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
    default: "Unassigned"
  },
  history: [
    {
      updated_at: { type: Date, default: Date.now },
      status: { type: String, enum: ['Pending', 'Follow up', 'Loss', 'Success'] },
      attender: { type: String, default: "Unassigned" },
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
  course_fee: { type: Number },
  balance_amount: { type: Number },
  next_due_date: { type: Date },
  payment_status: {
    type: String,
    enum: ['Unpaid', 'Partially Paid', 'Fully Paid'],
    default: 'Unpaid'
  }
}, {
  timestamps: true
});

studentEnquirySchema.index({ "history.updated_at": 1 });
studentEnquirySchema.index({ "history.follow_up_date": 1 });
studentEnquirySchema.pre('save', function (next) {

  if (this.isNew) {
    this.history.push({
      status: this.status || "Pending",
      attender: this.attender,
      note: "Enquiry Created",
      follow_up_date: this.follow_up_date,
      updated_at: new Date(),
      reminder_sent: false
    });
  }

  next();
});

const StudentEnquiry = mongoose.model('StudentEnquiry', studentEnquirySchema);

export default StudentEnquiry;
