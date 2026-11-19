const express = require('express');
const router = express.Router();
const {
  getAllTopics,
  getTopic,
  createTopic,
  updateTopic,
  deleteTopic
} = require('../controllers/topicController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect);

router.route('/')
  .get(getAllTopics)
  .post(authorize('admin'), createTopic);

router.route('/:id')
  .get(getTopic)
  .put(authorize('admin'), updateTopic)
  .delete(authorize('admin'), deleteTopic);

module.exports = router;
