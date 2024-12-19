const firebase = require('firebase/compat/app');
require('firebase/compat/firestore');

const firebaseConfig = {
    apiKey: "AIzaSyBh2UoIapoDGFcMq7xWbjSV7CkJRJgvkUI",
    authDomain: "visit-bhrath.firebaseapp.com",
    projectId: "visit-bhrath",
    storageBucket: "visit-bhrath.appspot.com", // Fixed typo here
    messagingSenderId: "1072247442404",
    appId: "1:1072247442404:web:5876613d0cb6b54d62d5f1",
    measurementId: "G-31D3YC86V0",
  };


firebase.initializeApp(firebaseConfig)
const db=firebase.firestore();
const review_section=db.collection("review_section")

module.exports=review_section;