import express from 'express';
import { getDb } from '../database/db.js';
import { checkAuthenticated } from '../middleware/auth.middleware.js';

const router = express.Router();

// Messages inbox
router.get('/', checkAuthenticated, async (req, res) => {
  try {
    const db = await getDb();
    
    // Get messages where user is sender or receiver
    const messages = await db.all(`
      SELECT m.*,
             u_sender.username AS sender_username,
             u_receiver.username AS receiver_username,
             CASE
               WHEN u_sender.user_type = 'seeker' THEN (SELECT full_name FROM job_seekers WHERE user_id = u_sender.id)
               WHEN u_sender.user_type = 'company' THEN (SELECT company_name FROM companies WHERE user_id = u_sender.id)
             END AS sender_name,
             CASE
               WHEN u_receiver.user_type = 'seeker' THEN (SELECT full_name FROM job_seekers WHERE user_id = u_receiver.id)
               WHEN u_receiver.user_type = 'company' THEN (SELECT company_name FROM companies WHERE user_id = u_receiver.id)
             END AS receiver_name
      FROM messages m
      JOIN users u_sender ON m.sender_id = u_sender.id
      JOIN users u_receiver ON m.receiver_id = u_receiver.id
      WHERE m.sender_id = ? OR m.receiver_id = ?
      ORDER BY m.created_at DESC
    `, [req.session.user.id, req.session.user.id]);
    
    // Group messages by conversation
    const conversations = {};
    
    for (const message of messages) {
      const otherUserId = message.sender_id === req.session.user.id ? message.receiver_id : message.sender_id;
      const otherUserName = message.sender_id === req.session.user.id ? message.receiver_name : message.sender_name;
      
      if (!conversations[otherUserId]) {
        conversations[otherUserId] = {
          userId: otherUserId,
          name: otherUserName,
          messages: []
        };
      }
      
      conversations[otherUserId].messages.push(message);
    }
    
    // Convert to array and sort by most recent message
    const conversationList = Object.values(conversations).sort((a, b) => {
      const aLatest = a.messages[0].created_at;
      const bLatest = b.messages[0].created_at;
      return new Date(bLatest) - new Date(aLatest);
    });
    
    // Mark unread messages as read
    await db.run(
      'UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND is_read = 0',
      [req.session.user.id]
    );
    
    res.render('messages/inbox', {
      title: 'Messages - uWork',
      conversations: conversationList
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    req.flash('error_msg', 'Error fetching messages');
    res.redirect('/dashboard');
  }
});

// Conversation with a user
router.get('/:userId', checkAuthenticated, async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const db = await getDb();
    
    // Get other user details
    const otherUser = await db.get('SELECT * FROM users WHERE id = ?', [otherUserId]);
    
    if (!otherUser) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/messages');
    }
    
    // Get name based on user type
    let otherUserName = otherUser.username;
    
    if (otherUser.user_type === 'seeker') {
      const seeker = await db.get('SELECT full_name FROM job_seekers WHERE user_id = ?', [otherUserId]);
      if (seeker && seeker.full_name) {
        otherUserName = seeker.full_name;
      }
    } else if (otherUser.user_type === 'company') {
      const company = await db.get('SELECT company_name FROM companies WHERE user_id = ?', [otherUserId]);
      if (company && company.company_name) {
        otherUserName = company.company_name;
      }
    }
    
    // Get messages between users
    const messages = await db.all(`
      SELECT * FROM messages
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
      ORDER BY created_at ASC
    `, [req.session.user.id, otherUserId, otherUserId, req.session.user.id]);
    
    // Mark messages as read
    await db.run(
      'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
      [otherUserId, req.session.user.id]
    );
    
    res.render('messages/conversation', {
      title: `Conversation with ${otherUserName} - uWork`,
      otherUser: {
        id: otherUserId,
        name: otherUserName,
        type: otherUser.user_type
      },
      messages
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    req.flash('error_msg', 'Error fetching conversation');
    res.redirect('/messages');
  }
});

// Send message
router.post('/send/:userId', checkAuthenticated, async (req, res) => {
  try {
    const receiverId = req.params.userId;
    const { message } = req.body;
    
    if (!message || message.trim() === '') {
      req.flash('error_msg', 'Message cannot be empty');
      return res.redirect(`/messages/${receiverId}`);
    }
    
    const db = await getDb();
    
    // Check if receiver exists
    const receiver = await db.get('SELECT id FROM users WHERE id = ?', [receiverId]);
    
    if (!receiver) {
      req.flash('error_msg', 'Recipient not found');
      return res.redirect('/messages');
    }
    
    // Insert message
    await db.run(
      'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
      [req.session.user.id, receiverId, message]
    );
    
    req.flash('success_msg', 'Message sent');
    res.redirect(`/messages/${receiverId}`);
  } catch (error) {
    console.error('Error sending message:', error);
    req.flash('error_msg', 'Error sending message');
    res.redirect(`/messages/${req.params.userId}`);
  }
});

// Start new conversation
router.get('/new/:userId', checkAuthenticated, async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const db = await getDb();
    
    // Get other user details
    const otherUser = await db.get('SELECT * FROM users WHERE id = ?', [otherUserId]);
    
    if (!otherUser) {
      req.flash('error_msg', 'User not found');
      return res.redirect('/messages');
    }
    
    // Get name based on user type
    let otherUserName = otherUser.username;
    
    if (otherUser.user_type === 'seeker') {
      const seeker = await db.get('SELECT full_name FROM job_seekers WHERE user_id = ?', [otherUserId]);
      if (seeker && seeker.full_name) {
        otherUserName = seeker.full_name;
      }
    } else if (otherUser.user_type === 'company') {
      const company = await db.get('SELECT company_name FROM companies WHERE user_id = ?', [otherUserId]);
      if (company && company.company_name) {
        otherUserName = company.company_name;
      }
    }
    
    res.render('messages/new-message', {
      title: `New Message - uWork`,
      otherUser: {
        id: otherUserId,
        name: otherUserName,
        type: otherUser.user_type
      }
    });
  } catch (error) {
    console.error('Error starting new conversation:', error);
    req.flash('error_msg', 'Error starting new conversation');
    res.redirect('/messages');
  }
});

export default router;