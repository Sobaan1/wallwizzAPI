const express = require('express');
const mysql = require('mysql2');
const dotenv = require('dotenv');

const app = express();
dotenv.config();

// Establishign Connection with railway server
const pool = mysql.createPool(process.env.DB_URL)

app.get('/checkdb', (req, res) => {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error('Error connecting to database:', err);
      res.status(500).json({ message: 'Database Connection Error' });
    } else {
      console.log('Database connected successfully');
      res.json({ message: 'Database connected successfully' });
      connection.release(); 
    }
  });
});


// Middleware to parse JSON bodies
app.use(express.json());

// Define route for handling GET and POST requests for images
app.get('/images', (req, res) => {
  pool.query('SELECT * FROM images', (error, results) => {
    if (error) {
      console.error('Error retrieving images:', error);
      res.status(500).json({ message: 'Internal Server Error' });
    } else {
      res.json(results);
    }
  });
});

app.post('/images', (req, res) => {
  const { imageUrl, genre, author } = req.body;
  insertImage(imageUrl, genre, author, res);
});

// Define routes for handling GET and POST requests for other genres
const genres = ['trending', 'ai_generated', 'superhero', 'anime', 'nature', 'motivation'];
genres.forEach((genre) => {
  app.get(`/${genre}`, (req, res) => {
    pool.query(`SELECT * FROM ${genre}`, (error, results) => {
      if (error) {
        console.error(`Error retrieving ${genre} images:`, error);
        res.status(500).json({ message: 'Internal Server Error' });
      } else {
        res.json(results);
      }
    });
  });

  app.post(`/${genre}`, (req, res) => {
    const { imageUrl, author } = req.body;
    insertImage(imageUrl, genre, author, res);
  });
});

// Function to insert image into the appropriate table
function insertImage(imageUrl, genre, author, res) {
  // Validation
  if (!imageUrl || !genre) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const table = genres.includes(genre.toLowerCase()) ? genre.toLowerCase() : 'images';

  // Check if the image URL already exists
  pool.query(`SELECT * FROM ${table} WHERE imageUrl = ?`, [imageUrl], (error, results) => {
    if (error) {
      console.error('Error checking image existence:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    if (results.length > 0) {
      // Image with the same URL already exists
      return res.status(409).json({ message: 'Image already available' });
    } else {
      // Insert the new image into the database
      pool.query(`INSERT INTO ${table} (imageUrl, genre, author) VALUES (?, ?, ?)`, [imageUrl, genre, author], (error, results) => {
        if (error) {
          console.error(`Error inserting image into ${table}:`, error);
          return res.status(500).json({ message: 'Internal Server Error' });
        } else {
          return res.status(201).json({ id: results.insertId, imageUrl, genre, author });
        }
      });
    }
  });
}

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});