import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    joined: { type: Date, default: Date.now },
    triviarole: { type: String, default: 'user' }
  },
  { collection: 'users' }
);

const model = mongoose.model('User', UserSchema);

export default model;
