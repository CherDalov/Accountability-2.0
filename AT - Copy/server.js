import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import { Low, JSONFile } from 'lowdb';
import bodyParser from 'body-parser';
import { nanoid } from 'nanoid';
import path from 'path';
import { fileURLToPath } from 'url';

(async () => {
  const app = express();
  
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const adapter = new JSONFile('db.json');
  const db = new Low(adapter);

  // Error handling for reading database
  try {
    await db.read();
    db.data ||= { users: [] };
  } catch (error) {
    console.error('Error reading from database:', error);
    process.exit(1); // Exit the server if database read fails
  }

  app.use(express.static('public'));
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());

  app.use(
    session({
      secret: 'your_secret_key',
      resave: false,
      saveUninitialized: false,
    })
  );

  function isAuthenticated(req, res, next) {
    if (req.session && req.session.userId) return next();
    else return res.redirect('/login.html');
  }

  app.get('/', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    try {
      await db.read();
      const userExists = db.data.users.find((u) => u.username === username);

      if (userExists) {
        return res.json({ success: false, message: 'Username already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      db.data.users.push({ id: nanoid(), username, password: hashedPassword, tasks: {} });
      await db.write();

      res.json({ success: true, message: 'Registration successful' });
    } catch (error) {
      console.error('Error during registration:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
      await db.read();
      const user = db.data.users.find((u) => u.username === username);

      if (!user) {
        return res.json({ success: false, message: 'Invalid credentials' });
      }

      const match = await bcrypt.compare(password, user.password);

      if (match) {
        req.session.userId = user.id;
        res.json({ success: true, message: 'Login successful' });
      } else {
        res.json({ success: false, message: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  });

  app.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login.html');
  });

  app.listen(3000, () => {
    console.log('Server is running on port 3000');
  });
})();
