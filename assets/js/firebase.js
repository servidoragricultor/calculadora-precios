const firebaseConfig = {
      apiKey: "AIzaSyBGEiIKYV8MiA8lN3lteHaE1XkYD4GRxug",
      authDomain: "calculadora-esquina.firebaseapp.com",
      projectId: "calculadora-esquina",
      storageBucket: "calculadora-esquina.firebasestorage.app",
      messagingSenderId: "721368379664",
      appId: "1:721368379664:web:7dd83fad394c3d909b3595",
      measurementId: "G-MV6X87D4J3"
    };
    firebase.initializeApp(firebaseConfig);
    window.auth = firebase.auth();
    window.db   = firebase.firestore();
