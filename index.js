const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const ArticleModel = require('./Articles');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = 5000;

// Cloudinary and Multer imports
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure Cloudinary Storage for Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'article_images', // Cloudinary folder name
    allowed_formats: ['jpg', 'png', 'gif'], // Allowed file formats
  },
});

// Create Multer instance
const upload = multer({ storage });

app.use(cors());
app.use(express.json());

// Connect to MongoDB Databases
async function connectToDatabases() {
  try {
    // Connect to the Articles database
    await mongoose.connect(process.env.MONGO_URI_Articles, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Successfully connected to Articles database');

    // Connect to the Admins database using a separate connection
    const adminDb = mongoose.createConnection(process.env.MONGO_URI_Admins, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Successfully connected to Admins database');

    // Use the `adminDb` connection for Admin model operations
    const Admin = adminDb.model('Admin', {
      name: String,
      email: String,
      password: String,
    });

    // Admin route
    app.post('/admin', async (req, res) => {
      const { name, email, password } = req.body;

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      const newAdmin = new Admin({
        name,
        email,
        password: hashedPassword,
      });

      try {
        await newAdmin.save();
        res.status(201).json({ message: 'Admin created successfully', admin: newAdmin });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
  } catch (error) {
    console.error('Error connecting to MongoDB databases:', error.message);
  }
}

connectToDatabases();

// Routes for Articles CRUD operations
app.get('/', (req, res) => {
  ArticleModel.find()
    .then((articles) => res.json(articles))
    .catch((err) => res.status(500).json({ error: err.message }));
});

app.get('/article/:id', (req, res) => {
  const { id } = req.params;
  ArticleModel.findById(id)
    .then((article) => res.json(article))
    .catch((err) => res.status(500).json({ error: err.message }));
});

// Create Article with Image
app.post('/create', upload.single('image'), async (req, res) => {
  const { title, content, author } = req.body;

  try {
    const newArticle = new ArticleModel({
      title,
      content,
      author,
      image: req.file ? req.file.path : null, // Cloudinary's URL for the uploaded image
    });

    const savedArticle = await newArticle.save();
    res.status(201).json(savedArticle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Article with New Image
app.put('/update/:id', upload.single('image'), async (req, res) => {
  const { title, content, author } = req.body;
  const updateFields = { title, content, author };

  if (req.file) {
    updateFields.image = req.file.path; // Cloudinary's URL for the new image
  }

  try {
    const updatedArticle = await ArticleModel.findByIdAndUpdate(req.params.id, updateFields, { new: true });
    res.status(200).json(updatedArticle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Article
app.delete('/delete/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deletedArticle = await ArticleModel.findByIdAndDelete(id);
    res.status(200).json({ message: 'Article deleted', article: deletedArticle });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
