// jshint esversion:8
import express from 'express';
import { Question, Theme, Questionnaire } from '../model/questions.js';
import { adminAuth } from './connectivity.js';
import cookieParser from 'cookie-parser';
import { model } from 'mongoose';

export default function (io) {
  const router = express.Router();
  router.use(cookieParser());

  // REST API for Question DB
  router.get('/questions', adminAuth, async (req, res) => {
    try {
      const questions = await Question.find({});
      res.json({ message: 'Questions found.', questions: questions });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: err });
    }
  });

  router.get('/questions/:id', adminAuth, async (req, res) => {
    try {
      const question = await Question.findById(req.params.id);
      if (!question) {
        return res.status(404).send('Question not found.');
      }
      res.json({ message: 'Question found.', question: question });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: err });
    }
  });

  router.post('/questions', adminAuth, async (req, res) => {
    try {
      const question = new Question({
        question: req.body.question,
        subtitle: req.body.subtitle,
        tags: req.body.tags,
        answers: req.body.answers
      });
      await question.save();
      res.json({ message: 'Question created!' });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: err });
    }
  });

  router.put('/questions/:id', adminAuth, async (req, res) => {
    try {
      const question = await Question.findByIdAndUpdate(
        req.params.id,
        {
          question: req.body.question,
          subtitle: req.body.subtitle,
          tags: req.body.tags,
          answers: req.body.answers
        },
        { new: true }
      );
      if (!question) {
        return res.status(404).json({ message: 'Question not found.' });
      }
      res.json({ message: 'Question updated!' });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: err });
    }
  });

  router.delete('/questions/:id', adminAuth, async (req, res) => {
    try {
      const question = await Question.findById(req.params.id);
      if (!question) {
        return res.status(404).json({ message: 'Question not found.' });
      }
      await question.remove();
      res.json({ message: 'Question deleted!' });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: err });
    }
  });

  // REST API for Theme DB

  router.get('/themes', adminAuth, async (req, res) => {
    try {
      const Themes = await Theme.find().populate('questions');
      res.status(200).json({ message: 'Themes found!', Themes });
    } catch (err) {
      res.status(500).json({ message: err });
    }
  });

  router.get('/themes/:id', adminAuth, async (req, res) => {
    try {
      var Theme = await Theme.findById(req.params.id).populate('questions');
      if (!Theme) {
        return res.status(404).send('Theme not found.');
      }
      res.status(200).json({ message: 'Theme found!', Theme });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err });
    }
  });

  router.post('/themes', adminAuth, async (req, res) => {
    // Should create the questions in the database

    try {
      var Theme = new Theme({
        theme: req.body.theme,
        subtitle: req.body.subtitle,
        questions: req.body.questions
      });
      await Theme.save();
      res.status(201).json({ message: 'Theme created!' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err });
    }
  });

  router.put('/themes/:id', adminAuth, async (req, res) => {
    try {
      const theme = await Theme.findByIdAndUpdate(
        req.params.id,
        {
          theme: req.body.theme,
          subtitle: req.body.subtitle,
          questions: req.body.questions
        },
        { new: true }
      );
      if (!Theme) {
        return res.status(404).json({ message: 'Theme not found.' });
      }
      res.status(200).json({ message: 'Theme updated!' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err });
    }
  });

  router.delete('/themes/:id', adminAuth, async (req, res) => {
    try {
      var theme = await Theme.findById(req.params.id);
      if (!theme) {
        return res.status(404).json({ message: 'Theme not found.' });
      }
      await theme.remove();
      res.status(200).json({ message: 'Theme deleted!' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err });
    }
  });

  // REST API for Questionnaire DB

  router.get('/questionnaires', async (req, res) => {
    try {
      // Only return title of questionnaires
      const questionnaires = await Questionnaire.find({}, 'title');
      if (!questionnaires) {
        return res.status(404).json({ message: 'Questionnaire not found.' });
      }
      res.status(200).json({ message: 'Questionnaire found!', questionnaires });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err });
    }
  });

  router.get('/questionnaires/:id', async (req, res) => {
    try {
      const questionnaire = await Questionnaire.findById(req.params.id).populate({
        path: 'themes',
        populate: {
          path: 'questions',
          model: 'Question'
        }
      });
      if (!questionnaire) {
        return res.status(404).json({ message: 'Questionnaire not found.' });
      }
      res.status(200).json({ message: 'Questionnaire found!', questionnaire });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err });
    }
  });

  router.post('/questionnaires', adminAuth, async (req, res) => {
    try {
      const questionnaire = new Questionnaire({
        title: req.body.title,
        subtitle: req.body.subtitle,
        themes: req.body.themes
      });
      await questionnaire.save();
      res.status(201).json({ message: 'Questionnaire created!' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err });
    }
  });

  router.put('/questionnaires/:title', adminAuth, async (req, res) => {
    try {
      const questionnaire = await Questionnaire.findOneAndUpdate(
        { title: req.params.title },
        {
          title: req.body.title,
          subtitle: req.body.subtitle,
          themes: req.body.themes
        },
        { new: true }
      );
      if (!questionnaire) {
        return res.status(404).json({ message: 'Questionnaire not found.' });
      }
      res.status(200).json({ message: 'Questionnaire updated!' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err });
    }
  });

  router.delete('/questionnaires/:title', adminAuth, async (req, res) => {
    try {
      const questionnaire = await Questionnaire.findOne({ title: req.params.title });
      if (!questionnaire) {
        return res.status(404).json({ message: 'Questionnaire not found.' });
      }
      await questionnaire.remove();
      res.status(200).json({ message: 'Questionnaire deleted!' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err });
    }
  });

  return router;
}
