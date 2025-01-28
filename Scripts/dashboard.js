import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB7dVpxKA6KsFUFz9IF2WiHEiUnMw1w50k",
  authDomain: "your-coin-b8a86.firebaseapp.com",
  projectId: "your-coin-b8a86",
  storageBucket: "your-coin-b8a86.firebasestorage.app",
  messagingSenderId: "443462665191",
  appId: "1:443462665191:web:98d623890976d149af3342",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();


function createCoinCard(id, imgUrl, coinName, coinUnit, totalInvest, coinCurrentPrice, yourCoinPrice, profitLoss) {
  const div = document.createElement("div");
  div.setAttribute("id", id);
  div.setAttribute("class", "Coin-Card");

  div.innerHTML = `
    <img src="${imgUrl}" alt="coin-images">
            <h3 class="coin-Card-Name">${coinName.toUpperCase()}</h3>
            <p class="coin-Card-Unit">Total Units: <span class="coin-card-data span-coin-unit">${coinUnit}</span></p>
            <p class="coin-Card-Invst">Total Investment:₹ <span class="coin-card-data span-coin-investment">${totalInvest.toLocaleString()}</span></p>
            <p class="coin-Card-Curr-Pr">Current Coin Price: <span class="coin-card-data">₹${coinCurrentPrice.toLocaleString()}</span></p>
            <p class="coin-Card-Your-Pr">Net Return: <span class="coin-card-data">₹${yourCoinPrice.toLocaleString()}</span></p>
            <p class="${ profitLoss > 0 ? "coin-Card-Profit" : "coin-Card-Loss"}"> ${ profitLoss > 0 ? 'Profit' : 'Loss'}: ₹${profitLoss.toLocaleString()}</p>
             <div class="coin-card-btns">
                <button class="coin-card-edit-btn">Edit</button>
                <button class="coin-card-del-btn">Delete</button> 
            </div>
  `;

  return div;
} 

let coinPriceMap = [];

const coinDataDisplay = document.getElementById("coinList");
// Function to display coin data
// Function to fetch coins for the authenticated user
   async function fetchCoins() {
    // Clear existing content and show a loading message
    coinDataDisplay.innerHTML = "<h3>Loading coins data.....</h3>";

    const loggedInUserId = localStorage.getItem("loggedInUserId");

    if (!loggedInUserId) {
      console.error("User is not logged in.");
      return;
    }

    try {
      // Reference to the "coins" subcollection under the user's document
      const coinsCollectionRef = collection(
        db,
        "users",
        loggedInUserId,
        "coins"
      );

      // Fetch live coin prices from CoinGecko API
      const res = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=inr&order=market_cap_desc&per_page=250&page=1&sparkline=false`
      );
      if (!res.ok) {
        throw new Error(`API request failed with status ${res.status}`);
      }
      const apiData = await res.json();

      if (!Array.isArray(apiData)) {
        throw new Error("Invalid CoinGecko API response");
      }

      // Map API data for fast lookups
      coinPriceMap = apiData.reduce((map, coin) => {
        map[coin.id] = coin;
        return map;
      }, {});

      // Fetch all documents in the "coins" subcollection
      const querySnapshot = await getDocs(coinsCollectionRef);

      if (querySnapshot.empty) {
        coinDataDisplay.innerHTML = "<h2>No coins found for this user.</h2>";
        console.log("No coins found for this user.");
      } else {
        // Clear loading message
        coinDataDisplay.innerHTML = "";

        // Iterate through Firestore documents and render data
        querySnapshot.forEach((doc) => {
          const userCoin = doc.data();
          const coinData = coinPriceMap[userCoin.coinName.toLowerCase()];

          if (!coinData) {
            console.warn(`No data found for coin: ${userCoin.coinName}`);
            return;
          }

          const totalValue = Number(userCoin.coinUnit) * coinData.current_price;
          const profitLoss = totalValue - Number(userCoin.investedAmount);
          coinDataDisplay.appendChild(
            createCoinCard( 
              doc.id,
              coinData.image,
              userCoin.coinName,
              userCoin.coinUnit,
              userCoin.investedAmount,
              coinData.current_price,
              totalValue,
              profitLoss
            )
          );

          console.log(`Coin ID: ${doc.id}, Data: `, userCoin);
        });
      }
    } catch (error) {
      console.error("Error fetching coins:", error);
      coinDataDisplay.innerHTML =
        "<p>Error loading coins. Please try again later.</p>";
    }
  } 
  


// Monitor user authentication state
onAuthStateChanged(auth, (user) => {
  if (user) {
    // Store the logged-in user's ID in localStorage
    localStorage.setItem("loggedInUserId", user.uid);
    console.log("User authenticated:", user.uid);

    // Fetch coins for the authenticated user
    fetchCoins();
  } else {
    // Redirect to login if no user is authenticated
    console.log("No user authenticated. Redirecting to login.");
    localStorage.removeItem("loggedInUserId");
    window.location.href = "index.html";
  }
});

// Logout functionality
const logoutButton = document.getElementById("logOutBtn");
logoutButton.addEventListener("click", () => {
  localStorage.removeItem("loggedInUserId");
  signOut(auth)
    .then(() => {
      window.location.href = "index.html";
    })
    .catch((error) => {
      console.error("Error signing out:", error);
    });
});


// Add coin functionality
function addCoinData(event){
    event.preventDefault();
  
    const coinName = document.getElementById("coinName").value.trim();
    const coinUnit = document.getElementById("coinUnit").value.trim();
    const investedAmount = document.getElementById("investedAmount").value.trim();
    const loggedInUserId = localStorage.getItem("loggedInUserId");

    if (!loggedInUserId) {
      console.error("User is not logged in. Cannot add coin.");
      return;
    }

    if (
      !coinName ||
      !coinUnit ||
      !investedAmount ||
      isNaN(parseFloat(coinUnit)) ||
      isNaN(parseFloat(investedAmount)) ||
      parseFloat(coinUnit) <= 0 ||
      parseFloat(investedAmount) <= 0
    ) {
      alert("Invalid input data");
      addCoinForm.reset();
      return;
    }

    if (coinPriceMap[coinName.toLowerCase()] === undefined) {
      alert("Invalid coin name");
      addCoinForm.reset();
      return;
    }
  
    const coinData = {
      coinName,
      coinUnit,
      investedAmount,
      timestamp: new Date().toISOString(),
    };
  
    const coinsCollectionRef = collection(db, "users", loggedInUserId, "coins");
  
    addDoc(coinsCollectionRef, coinData)
      .then(() => {
        console.log("Coin added successfully");
        fetchCoins(); // Refresh the coin list after adding a new coin
      })
      .catch((error) => {
        console.error("Error adding coin:", error);
      });
  
    addCoinForm.reset();
  }
// Event listener for the form submission
const addCoinForm = document.getElementById("coinForm");
addCoinForm.addEventListener("submit", addCoinData);


// Event Delegation for delete & edit functionality
coinDataDisplay.addEventListener('click', (event) => {
  // Check if the clicked element is a delete button
  if (event.target.classList.contains('coin-card-del-btn')) { 
    const coinId = event.target.parentElement.parentElement.getAttribute('id');
    const loggedInUserId = localStorage.getItem("loggedInUserId");
    console.log("Coin ID:", coinId);
    const coinsCollectionRef = collection(db, "users", loggedInUserId, "coins");

    deleteDoc(doc(coinsCollectionRef, coinId))
    .then(() => {
        console.log("Coin deleted successfully");
        fetchCoins(); // Refresh the coin list after deleting a coin
      })
      .catch((error) => {
        console.error("Error deleting coin:", error);
      });
  }
  // Check if the clicked element is an edit button
  if (event.target.classList.contains('coin-card-edit-btn')) { 
    const coinId = event.target.parentElement.parentElement.getAttribute('id');
    const coinName = event.target.parentElement.parentElement.querySelector('.coin-Card-Name').textContent;
    const coinUnits = event.target.parentElement.parentElement.querySelector('.span-coin-unit').textContent;
    const amount = event.target.parentElement.parentElement.querySelector('.span-coin-investment').textContent;
    document.getElementById("submitCoinBtn").textContent = "Update";

    console.log(coinId, coinName, coinUnits, amount);


    document.getElementById("coinName").value = coinName;
    document.getElementById("investedAmount").value = Number(amount);
    document.getElementById("coinUnit").value = Number(coinUnits);

    addCoinForm.removeEventListener("submit", addCoinData);

    addCoinForm.addEventListener("submit", function updateCoinData(e){
        e.preventDefault();
        const updatedCoinName = document.getElementById("coinName").value.trim();
        const updatedAmount = document.getElementById("investedAmount").value.trim();
        const updatedCoinUnits = document.getElementById("coinUnit").value.trim();
        const loggedInUserId = localStorage.getItem("loggedInUserId");
        document.getElementById("submitCoinBtn").disabled = true;
        document.getElementById("submitCoinBtn").textContent = "Updating...";

        if (coinPriceMap[updatedCoinName.toLowerCase()] === undefined) {
          alert("Invalid coin name");
          return;
        }

        const updatedCoinData = {
          coinName: updatedCoinName,
          coinUnit: updatedCoinUnits,
          investedAmount: updatedAmount,
          timestamp: new Date().toISOString(),
        };

        const coinsCollectionRef = collection(db, "users", loggedInUserId, "coins");
        const coinDocRef = doc(coinsCollectionRef, coinId);

        updateDoc(coinDocRef, updatedCoinData)
        .then(() => {
            console.log("Coin updated successfully");
            document.getElementById("submitCoinBtn").disabled = false;
            document.getElementById("submitCoinBtn").textContent = "Add";
            addCoinForm.reset();
            fetchCoins(); // Refresh the coin list after updating a coin
          })
          .catch((error) => {
            console.error("Error updating coin:", error);
          });
        addCoinForm.removeEventListener("submit", updateCoinData);
        addCoinForm.addEventListener("submit", addCoinData);
      });
  }
});