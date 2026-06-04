import mongoose from 'mongoose';

const QuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  subtitle: { type: String },
  tags: [{ type: String }],
  answers: [{ type: String, required: true }]
});

const ThemeSchema = new mongoose.Schema({
  theme: { type: String, required: true },
  subtitle: { type: String },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }]
});

const QuestionnaireSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  subtitle: { type: String },
  themes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Theme' }]
});

const Questionnaire = mongoose.model('Questionnaire', QuestionnaireSchema);
const Theme = mongoose.model('Theme', ThemeSchema);
const Question = mongoose.model('Question', QuestionSchema);

export { Questionnaire, Theme, Question };
