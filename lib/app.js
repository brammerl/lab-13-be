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
          VALUES ($1, $2)
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
app.get('/api/favorites/:id', async(req, res) => {
  console.log(req);
  const data = await client.query(`SELECT favorites.id, favorites.name, favorites.brewery_type, favorites.website_url, favorites.user_id
  FROM favorites
  JOIN users
  on favorites.user_id = users.id
  WHERE users.id = $1`,
  [req.params.id]);

  res.json(data.rows);
});

// Add a new favorite
app.post('/api/favorites/', async(req, res) => {
  console.log('FINDING USER ID', req.userId);
  const data = await client.query(`
    INSERT into favorites (name, brewery_type, website_url, user_id)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `, [req.body.name, req.body.brewery_type, req.body.website_url, req.userId]
  );

  res.json(data.rows);
});

// Delete a favorite
app.delete('api/favorites/:id', async(req, res) => {
  const result = await client.query(`
  DELETE FROM favorites
  WHERE favorites.id = $1
  RETURNING*;`,
  [req.params.id]);
  res.json(result.rows);
});

app.use(require('./middleware/error'));

module.exports = app;
