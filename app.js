const bookForm = document.getElementById("book-form");
const bookList = document.getElementById("book-list");
const readBookList = document.getElementById("read-book-list");
const mainPage = document.getElementById("main-page");
const readPage = document.getElementById("read-page");

let books = JSON.parse(localStorage.getItem("books")) || [];

// Save books to localStorage
function saveBooks() {
  localStorage.setItem("books", JSON.stringify(books));
}

// Render the book list
function renderBooks() {
  bookList.innerHTML = books.map((book, index) => `
    <tr>
      <td>${book.title}</td>
      <td>
        <span onclick="changeStatus(${index})" style="cursor: pointer;">
          <div class="status-bubble ${book.status.toLowerCase().replace(' ', '-')}" title="${book.status}"></div>
          ${book.status}
        </span>
      </td>
      <td>${book.added || 'N/A'}</td>
      <td><button onclick="deleteBook(${index})">X</button></td>
    </tr>
  `).join('');
}

// Render the "Read Books" list
function renderReadBooks() {
  readBookList.innerHTML = books
    .filter(book => book.status === "Read")
    .map((book, index) => `
      <tr>
        <td>${book.title}</td>
        <td>${book.timestamp || 'N/A'}</td>
        <td><button onclick="deleteBook(${index}, 'read')">X</button></td>
      </tr>
    `).join('');
}

function addToTable(title) {
  const now = new Date().toLocaleString(); // Human-readable format
  books.unshift({ title, status: "Not Read", timestamp: null, added: now }); // Add to the beginning
  saveBooks();
  sortTable('added', 'all', 'desc'); // Sort by "Date Added" to ensure correct order
}

// Add a new book
bookForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = document.getElementById("book-title").value;
  addToTable(title);
  bookForm.reset();
});

// Change book status
window.changeStatus = (index) => {
  const statuses = ["Not Read", "Reading", "Read"];
  const currentStatus = books[index].status;
  const nextStatus = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length];
  books[index].status = nextStatus;

  // Add a timestamp when marking as "Read"
  if (nextStatus === "Read" && !books[index].timestamp) {
    books[index].timestamp = new Date().toLocaleString();
  }

  saveBooks(); // Save the updated list to localStorage
  renderBooks(); // Re-render the table
  renderReadBooks(); // Update the "Read Books" view if necessary
  goalTracker.updateCompleted(); // Update the goal tracker progress
};

window.deleteBook = (index, page) => {
  books.splice(index, 1);
  saveBooks();
  renderBooks();
  renderReadBooks();
  goalTracker.updateCompleted(); // Update progress bar

  if (page === "read") {
    showPage("read");
  }
};

const goalTracker = {
  name: localStorage.getItem("goalName") || "My Reading Goal",
  target: parseInt(localStorage.getItem("goalTarget"), 10) || 0,
  completed: books.filter(book => book.status === "Read").length,

  // Save goal data to localStorage
  save() {
    localStorage.setItem("goalName", this.name);
    localStorage.setItem("goalTarget", this.target);
  },

  // Update completed count based on current books
  updateCompleted() {
    this.completed = books.filter(book => book.status === "Read").length;
    renderGoalTracker(); // Re-render the tracker with the updated count
  },

  // Set a new goal
  setGoal(name, target) {
    this.name = name;
    this.target = target;
    this.save();
    this.updateCompleted(); // Ensure progress is recalculated after setting a new goal
  },
};

function renderGoalTracker() {
  const trackerElement = document.getElementById("goal-tracker");

  const percentage = goalTracker.target > 0
    ? Math.min((goalTracker.completed / goalTracker.target) * 100, 100)
    : 0;

  const radius = 50; // Radius of the ring
  const circumference = 2 * Math.PI * radius; // Circumference of the circle
  const progressOffset = circumference - (percentage / 100) * circumference; // Progress offset for stroke-dasharray

  trackerElement.innerHTML = `
    <h2>${goalTracker.name}</h2>
    <div style="display: flex; justify-content: center; align-items: center; position: relative; width: 150px; height: 150px; margin: 20px auto;">
      <svg width="150" height="150" viewBox="0 0 150 150" style="transform: rotate(-90deg);">
        <!-- Background Circle -->
        <circle cx="75" cy="75" r="${radius}" stroke="#e0e0e0" stroke-width="10" fill="none"></circle>
        <!-- Progress Circle -->
        <circle 
          cx="75" 
          cy="75" 
          r="${radius}" 
          stroke="green" 
          stroke-width="10" 
          fill="none"
          stroke-dasharray="${circumference}" 
          stroke-dashoffset="${progressOffset}" 
          style="transition: stroke-dashoffset 0.3s ease;"></circle>
      </svg>
      <!-- Centered Text -->
      <div style="position: absolute; text-align: center; font-family: Arial, sans-serif;">
        <div style="font-size: 18px; font-weight: bold;">${goalTracker.completed} / ${goalTracker.target}</div>
        <div style="font-size: 14px; color: #555;">${Math.round(percentage)}%</div>
      </div>
    </div>
    <button onclick="showGoalForm()" style="display: block; margin: 10px auto;">Set Goal</button>
  `;
}

// Show a form to set a new goal
function showGoalForm() {
  const trackerElement = document.getElementById("goal-tracker");
  trackerElement.innerHTML = `
    <h2>Set Reading Goal</h2>
    <form id="goal-form">
      <div>
        <label for="goal-name">Goal Name:</label>
        <input type="text" id="goal-name" placeholder="e.g., 2025 Goal" required>
      </div>
      <div>
        <label for="goal-target">Number of Books:</label>
        <input type="number" id="goal-target" min="1" required>
      </div>
      <button type="submit">Save Goal</button>
    </form>
  `;

  const goalForm = document.getElementById("goal-form");
  goalForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("goal-name").value;
    const target = parseInt(document.getElementById("goal-target").value, 10);
    goalTracker.setGoal(name, target);
  });
}

// Update the tracker whenever a book is marked as "Read"
function updateTrackerOnStatusChange() {
  goalTracker.updateCompleted();
}

let currentPage = "all"; // Track the current page

// Swipe detection variables
let startX = 0;
let endX = 0;

// Handle touch start
function handleTouchStart(event) {
  startX = event.touches[0].clientX; // Record the starting X position
}

// Handle touch end
function handleTouchEnd(event) {
  endX = event.changedTouches[0].clientX; // Record the ending X position
  handleSwipe();
}

// Determine swipe direction and switch pages
function handleSwipe() {
  const diffX = startX - endX;

  // Swipe left to switch to "Read Books"
  if (diffX > 60 && currentPage === "all") {
    showPage("read");
  }
  // Swipe right to switch to "All Books"
  else if (diffX < -60 && currentPage === "read") {
    showPage("all");
  }
}

// Show the specified page with animation
function showPage(page) {
  const mainPage = document.getElementById("main-page");
  const readPage = document.getElementById("read-page");

  if (page === "all") {
    mainPage.style.left = "0"; // Move "All Books" into view
    readPage.style.left = "100%"; // Move "Read Books" out of view
    currentPage = "all";
  } else if (page === "read") {
    mainPage.style.left = "-100%"; // Move "All Books" out of view
    readPage.style.left = "0"; // Move "Read Books" into view
    currentPage = "read";
  }
}

const sortStates = {
  all: { column: 'added', direction: 'desc' }, // Default: "Date Added" descending
  read: { column: 'timestamp', direction: 'desc' }, // Default: "Completion Date" descending
};

const statusOrder = ["Not Read", "Reading", "Read"];

function sortTable(column, table = 'all', direction = null) {
  direction = direction || (sortStates[table].column === column && sortStates[table].direction === 'asc' ? 'desc' : 'asc');
  sortStates[table] = { column, direction };

  let booksToSort = [...books];
  if (table === 'read') {
    booksToSort = booksToSort.filter(book => book.status === 'Read');
  }

  booksToSort.sort((a, b) => {
    let valA = a[column] || '';
    let valB = b[column] || '';

    // Custom sorting for the "status" column
    if (column === 'status') {
      valA = statusOrder.indexOf(valA);
      valB = statusOrder.indexOf(valB);
    }

    // Convert dates for comparison
    if (column === 'timestamp' || column === 'added') {
      valA = new Date(valA);
      valB = new Date(valB);
    }

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  if (table === 'all') {
    books = booksToSort;
    renderBooks();
  } else if (table === 'read') {
    renderReadBooks(booksToSort);
  }

  updateSortIcons(column, table, direction);
}

function updateSortIcons(column, table, direction) {
  // Clear all icons for the relevant table
  const icons = document.querySelectorAll(`span[id^="sort-icon-${table}"]`);
  icons.forEach(icon => (icon.textContent = ''));

  // Set the active column's icon
  const iconId = `sort-icon-${table}-${column}`;
  const icon = document.getElementById(iconId);
  if (icon) {
    icon.textContent = direction === 'asc' ? '↑' : '↓';
  }
}

// Select camera button and input
const cameraBtn = document.getElementById("camera-btn");
const cameraInput = document.getElementById("camera-input");

// Camera button click event
cameraBtn.addEventListener("click", () => {
  cameraInput.click(); // Open the camera dialog
});

// Handle file input change (when user captures an image)
cameraInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const imgElement = document.createElement("img");
      imgElement.src = e.target.result;
      imgElement.alt = "Captured Image";
      imgElement.style.maxWidth = "300px"; // Adjust size as needed

      // Optionally, display the image on the page
      document.body.appendChild(imgElement);

      console.log('Processing!!')

      // Process the image with Tesseract OCR
      Tesseract.recognize(
        imgElement.src, // Image source (base64 URL)
        'eng', // Language (you can also use other language data like 'eng+deu' for multiple languages)
        {
          logger: (m) => console.log(m), // Optional: log progress
          tessedit_char_whitelist: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890", // Limit characters to basic alphanumeric for title recognition,
          ocr_engine_mode: 1, // Use LSTM for better accuracy
          tessedit_pageseg_mode: 3, // Auto page segmentation
        }
      ).then(({ data: { text, words } }) => {
        console.log('Recognized Text:', text); // Output OCR result
        console.log('Recognized Words:', words); // Output OCR result
        const bookTitle = extractTitleFromText(text);
        console.log('Book Title:', bookTitle); // Display the extracted title
        addToTable(bookTitle);
      });
    };
    reader.readAsDataURL(file); // Convert image to base64
  }
});

function extractTitleFromText(text) {
  // Strip newline characters and combine all words into a single sentence
  const combinedText = text.replace(/\n/g, " ").trim();
  
  // Return the cleaned-up combined text
  return combinedText || "Title not found";
}

document.addEventListener("DOMContentLoaded", () => {
  sortTable('added', 'all', 'desc'); // Ensure default sorting is descending by "Date Added"
  sortTable('timestamp', 'read', 'desc'); // Ensure default sorting is descending by "Date Added"
});

// Add touch event listeners to the page container
const pageContainer = document.getElementById("page-container");
pageContainer.addEventListener("touchstart", handleTouchStart, { passive: true });
pageContainer.addEventListener("touchend", handleTouchEnd, { passive: true });

// Initial render
renderBooks();
renderReadBooks();
renderGoalTracker();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}
