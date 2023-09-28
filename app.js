const express = require('express');
const bodyParser = require('body-parser');
const firebaseAdmin = require('firebase-admin');
const passwordHash = require('password-hash'); // Import the password-hash module
const app = express();

// Configure Firebase Admin SDK with your credentials
const serviceAccount = require('/Users/SASIDHAR/Documents/WD401/serviceAccountKey.json');
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
});

// Initialize Firestore and create a reference to it
const db = firebaseAdmin.firestore(); // Add this line

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));

// Routes
app.get('/', (req, res) => {
  res.render('login');
});

app.get('/signup', (req, res) => {
  res.render('signup');
});

// Handle signup
app.post('/signup', async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  // Check if the email is already in use
  try {
    const existingUser = await firebaseAdmin.auth().getUserByEmail(email);

    // If the email exists, return an error
    console.error('Email is already in use.');
    res.render('signup', { duplicateEmailError: true }); // Pass the error state
    return;
  }
  catch (error) {
    // The error indicates that the email doesn't exist, proceed with signup
    if (error.code === 'auth/user-not-found') {


// Check password requirements
if (password.length < 8) {
  console.error('Password must be at least 8 characters long.');
  res.redirect('/signup');
  return;
}

// Hash the password
const hashedPassword = passwordHash.generate(password);

  try {
    const userRecord = await firebaseAdmin.auth().createUser({
      email: email,
      password: hashedPassword, // Store the hashed password
    });

    // Store user details (email) in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email: email,
      password: hashedPassword,
    });
    console.log('Successfully created user with UID:', userRecord.uid);
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error creating user:', error);
    res.redirect('/signup');
  } 
}
}
});

// Handle login
app.post('/login', async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  try {
    const userRecord = await firebaseAdmin.auth().getUserByEmail(email);
    const storedHashedPassword = userRecord.password; // Retrieve the stored hashed password
    if (passwordHash.verify(password, storedHashedPassword)) {
      console.log('Password is correct');
      res.redirect('/dashboard');
    }
    else {
      console.error('Incorrect password');
      res.redirect('/');
    }
    console.log('Successfully fetched user data:', userRecord.toJSON());
    res.redirect('/dashboard');
  } catch (error) {
    console.error('User not registered');
    res.redirect('/');
  }
});

app.get('/dashboard', (req, res) => {
  res.render('dashboard');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
