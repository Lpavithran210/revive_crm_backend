import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  fee: {
    type: Number,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

courseSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

export default mongoose.model('Course', courseSchema);
