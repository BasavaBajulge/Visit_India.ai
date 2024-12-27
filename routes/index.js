var express = require('express');
var router = express.Router();
const OpenAI = require('openai');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const multer = require('multer');
const reviewSection = require('./config');

// Set up multer storage (e.g., saving uploaded files in a "uploads" directory)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads'); // Specify the folder where files will be saved
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname); // Create unique filenames
  }
});

// Initialize upload middleware
const upload = multer({ storage: storage });

/* GET home page. */
const openai = new OpenAI({
  apiKey: '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',
  baseURL: 'https://integrate.api.nvidia.com/v1', // Base URL from your provided code
});

router.get('/', function(req, res, next) {
  res.render('index');
});

router.get('/discover', function (req, res, next) {
  const places = [
    {
      title: "Gujarat",
      description: "Gujarat, located on India's western coast, is known for its vibrant culture, historic temples, and the Gir National Park, home to Asiatic lions. It’s famous for festivals like Navratri and its thriving industries, including textiles and diamond polishing.",
      imageUrl: "/images/top1.jpg",
      link: "https://www.gujarattourism.com/"
    },
    {
      title: "Maharashtra",
      description: "Maharashtra, home to Mumbai, India's financial hub, blends modernity with tradition. It features scenic beaches, historic forts, and cultural landmarks like the Ajanta and Ellora caves. Maharashtra is a leading state in industry, tourism, and film production.",
      imageUrl: "/images/top2.jpg",
      link: "https://maharashtratourism.gov.in/"
    },
    {
      title: "Kerala",
      description: "Kerala, in southern India, is famed for its grand temples, scenic hill stations, and vibrant culture. From the iconic temples of Madurai and Thanjavur to the serene landscapes of Ooty and Kodaikanal, the state offers a rich mix of history, nature, and local arts.",
      imageUrl: "/images/top3.avif",
      link: "https://www.keralatourism.org/"
    },
    {
      title: "Karnataka",
      description: "Karnataka, located in southern India, is a treasure trove of diverse attractions, blending history, nature, and culture. Known for the ancient ruins of Hampi, the majestic Mysore Palace, and the beautiful Western Ghats, Karnataka offers something for every traveler.",
      imageUrl: "/images/top4.avif",
      link: "https://karnatakatourism.org/"
    },
    {
      title: "Rajasthan",
      description: "Rajasthan, the Land of Kings, is famed for its royal heritage, desert landscapes, and grand forts and palaces. Known for cities like Jaipur, Udaipur, and Jodhpur, the state offers iconic sites such as the Amber Fort, Lake Palace, and Mehrangarh Fort. The vibrant culture, colorful festivals, and traditional Rajasthani cuisine create a unique experience for visitors.",
      imageUrl: "/images/top5.jpeg",
      link: "https://www.tourism.rajasthan.gov.in/"
    },
    {
      title: "The Andaman and Nicobar Islands",
      description: "The Andaman and Nicobar Islands, a tropical paradise in the Bay of Bengal, are known for their pristine beaches, turquoise waters, and lush rainforests. This idyllic destination offers breathtaking attractions like Radhanagar Beach, Havelock Island, and the historic Cellular Jail in Port Blair.",
      imageUrl: "/images/top6.avif",
      link: "https://www.andamantourism.gov.in/"
    }
  ];

  res.render('discover', { places });
});

// AI Trip Planner
router.get('/ai-trip-planner', (req, res) => {
  res.render('ai-trip-planner', { tripPlan: null });
});

router.post('/ai-trip-planner', async (req, res) => {
  const { place, numPeople, numDays } = req.body;

  const tripPrompt = `Plan a trip for ${numPeople} people to ${place} for ${numDays} days. Give activities days wise in new line without any star, give it in a good format.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "meta/llama2-70b",
      messages: [{ role: "user", content: tripPrompt }],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const tripPlan = completion.choices[0].message.content;
    res.render('ai-trip-planner', { tripPlan, place });
  } catch (error) {
    console.error('Error generating trip plan:', error);
    res.render('ai-trip-planner', { tripPlan: 'Failed to generate trip plan', place });
  }
});

// Group Trip Reminder
router.get("/group-trip", (req, res) => {
  res.render("group-trip");
});

const reminders = [];
const transporter = nodemailer.createTransport({
  host: 'in-v3.mailjet.com',
  port: 587,
  secure: false,
  auth: {
    user: '57aad516e791e5859a29cd0d23ed0234',
    pass: '9ce5d2df7111422380dc7f138b662db1',
  },
});

function sendEmail(email, message) {
  const mailOptions = {
    from: 'travelmate.remainder@gmail.com',
    to: email,
    subject: 'You have a plan from Visit Bharat',
    text: message,
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error(`Error sending email to ${email}:`, err.message);
    } else {
      console.log(`Email sent successfully to ${email}. Response: ${info.response}`);
    }
  });
}

router.post('/group-trip', (req, res) => {
  const { myEmail, friendsEmails, tripPlan, date, time } = req.body;
  const emails = [myEmail, ...friendsEmails.split(',').map(email => email.trim())];
  const reminderDateTime = new Date(`${date}T${time}`);

  if (isNaN(reminderDateTime)) {
    return res.status(400).send('Invalid date or time.');
  }

  reminders.push({ emails, reminderDateTime, tripPlan });

  const cronTime = `${reminderDateTime.getMinutes()} ${reminderDateTime.getHours()} ${reminderDateTime.getDate()} ${reminderDateTime.getMonth() + 1} *`;

  try {
    cron.schedule(cronTime, () => {
      emails.forEach(email => sendEmail(email, tripPlan));
    });
    res.send('Group trip reminder set successfully!');
  } catch (err) {
    console.error('Error scheduling cron job:', err.message);
    res.status(500).send('Error setting reminder.');
  }
});

// Reviews
router.get("/review", async (req, res) => {
  try {
    const snapshot = await reviewSection.get();
    const reviews = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.render("review", { reviews });
  } catch (err) {
    console.error("Error fetching reviews:", err);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/review", async (req, res) => {
  const { name, place, review } = req.body;

  if (!name || !place || !review) {
    return res.status(400).send("All fields are required!");
  }

  try {
    await reviewSection.add({ name, place, review });
    res.redirect("/review");
  } catch (err) {
    console.error("Error saving review:", err);
    res.status(500).send("Internal Server Error");
  }
});

// // Search route
// router.get('/search', (req, res) => {
//   const place = req.query.place?.toLowerCase();
//   const tourismSites = {
//       'andhra pradesh': 'https://www.aptourism.gov.in',
//       'arunachal pradesh': 'https://www.arunachaltourism.com',
//       'assam': 'https://www.assamtourism.gov.in',
//       'bihar': 'https://www.bihartourism.gov.in',
//       'chhattisgarh': 'https://www.tourism.cg.gov.in',
//       'goa': 'https://www.goa-tourism.com',
//       'gujarat': 'https://www.gujarattourism.com',
//       'haryana': 'https://www.haryanatourism.gov.in',
//       'himachal pradesh': 'https://www.himachalpradesh.gov.in/tourism',
//       'jharkhand': 'https://www.jharkhandtourism.gov.in',
//       'karnataka': 'https://www.karnatakatourism.org',
//       'kerala': 'https://www.keralatourism.org',
//       'madhya pradesh': 'https://www.mptourism.com',
//       'maharashtra': 'https://www.maharashtratourism.gov.in',
//       'manipur': 'https://www.manipurtourism.gov.in',
//       'meghalaya': 'https://www.meghalayatourism.in',
//       'mizoram': 'https://www.mizoramtourism.org',
//       'nagaland': 'https://www.tourismnagaland.com',
//       'odisha': 'https://www.odishatourism.gov.in',
//       'punjab': 'https://punjabtourism.punjab.gov.in',
//       'rajasthan': 'https://www.tourism.rajasthan.gov.in',
//       'sikkim': 'https://www.sikkimtourism.gov.in',
//       'tamil nadu': 'https://www.tamilnadutourism.tn.gov.in',
//       'telangana': 'https://www.telanganatourism.gov.in',
//       'tripura': 'https://tripuratourism.gov.in',
//       'uttar pradesh': 'https://www.uptourism.gov.in',
//       'uttarakhand': 'https://uttarakhandtourism.gov.in',
//       'west bengal': 'https://wbtourism.gov.in',
//       'andaman and nicobar islands': 'https://www.andamantourism.gov.in',
//       'chandigarh': 'https://chandigarhtourism.gov.in',
//       'dadra and nagar haveli and daman and diu': 'https://dnhddtourism.gov.in',
//       'delhi': 'https://www.delhitourism.gov.in',
//       'jammu and kashmir': 'https://www.jktdc.co.in',
//       'ladakh': 'https://www.ladakhtourism.in',
//       'lakshadweep': 'https://www.lakshadweeptourism.com',
//       'puducherry': 'https://www.tourismpondicherry.com',
    
//   };

//   const redirectUrl = tourismSites[place] || 'https://incredibleindia.org';
//   res.redirect(redirectUrl);
// });

router.get('/logout', (req, res) => {
  firebase.auth().signOut().then(() => {
    res.redirect('/');
  }).catch((error) => {
    console.error('Error signing out:', error.message);
    res.status(500).send('Error logging out');
  });
});

router.get("/nav", (req, res) => {
  res.render("nav");
});

module.exports = router;
