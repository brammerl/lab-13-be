const express = require('express');
const cors = require('cors');
const client = require('./client.js');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Auth
const ensureAuth = require('./auth/ensure-auth.js');
const createAuthRoutes = require('./auth/create-auth-routes.js');
const authRoutes = createAuthRoutes({
  selectUser(email) {
    return client.query(`
          SELECT id, email, hash
          FROM users
          WHERE email = $1;
      `,
    [email]
    ).then(result => result.rows[0]);
  },
  insertUser(user, hash) {
    console.log(user);
    return client.query(`
          INSERT into users (email, hash)
          VALUES ($1, $2, $3)
          RETURNING id, email;
      `,
    [user.email, hash]
    ).then(result => result.rows[0]);
  }
});


// setup authentication routes to give user an auth token
// creates a /auth/signin and a /auth/signup POST route. 
// each requires a POST body with a .email and a .password
app.use('/auth', authRoutes);

// everything that starts with "/api" below here requires an auth token!
app.use('/api', ensureAuth);

// and now every request that has a token in the Authorization header will have a `req.userId` property for us to see who's talking
app.get('/api/test', (req, res) => {
  res.json({
    message: `in this proctected route, we get the user's id like so: ${req.userId}`
  });
});

// View the logged-in user's favorites
app.get('/api/favorites', async(req, res) => {
  console.log(req);
  const data = await client.query('SELECT * FROM favorites WHERE user_id = $1', [req.userid]);

  res.json(data.rows);
});

// Add a new favorite
app.post('/api/favorites', async(req, res) => {
  console.log('adding a favorite!');
  // const data = await client.query('SELECT * from favorites');

  // res.json(data.rows);
});

// app.get('/breweries', async(req, res) => {
//   const data = await 
// });

app.use(require('./middleware/error'));

module.exports = app;
