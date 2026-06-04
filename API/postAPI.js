import express from 'express';
import Post from '../model/post.js';

export default function (io) {
  const router = express.Router();

  router.get('/blogs', async (req, res) => {
    Post.find({}, (err, posts) => {
      if (err) {
        console.log(err);
      } else {
        res.send(posts);
      }
    });
  });

  router.get('/blogs/:title', async (req, res) => {
    Post.find({ title: req.params.title }, (err, posts) => {
      if (err) {
        res.send(err);
      } else {
        res.send(posts);
      }
    });
  });

  router.post('/blogs', async (req, res) => {
    const post = new Post({
      title: req.body.title,
      content: req.body.content,
      tags: req.body.tags
    });
    post.save((err) => {
      if (err) {
        res.send(err);
      } else {
        res.send('Post saved!');
      }
    });
  });

  router.put('/blogs/:title', async (req, res) => {
    Post.updateOne(
      { title: req.params.oldtitle },
      { $set: { title: req.params.title, content: req.body.content, tags: req.body.tags } },
      (err) => {
        if (err) {
          res.send(err);
        } else {
          res.send('Post updated!');
        }
      }
    );
  });

  router.delete('/blogs/:title', async (req, res) => {
    Post.deleteOne({ title: req.params.title }, (err) => {
      if (err) {
        res.send(err);
      } else {
        res.send('Post deleted!');
      }
    });
  });

  return router;
}
