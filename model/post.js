import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    tags: { type: Array },
    date: { type: Date, default: Date.now },
    author: { type: String, required: true }
  },
  { collection: 'posts' }
);

const model = mongoose.model('Post', postSchema);

export default model;
