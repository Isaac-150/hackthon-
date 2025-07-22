// Global state
let currentLang = localStorage.getItem('artisanLang') || 'TA';
let isListening = false;
let recognition = null;
let products = [];
let userID = 'NOMII-A-' + Math.floor(1000 + Math.random() * 9000);
let currentField = null;

// DOM Elements
const langToggleBtn = document.getElementById('lang-toggle-btn');
const micBtn = document.getElementById('voice-btn');
const voiceStatus = document.getElementById('voice-status');
const productForm = document.getElementById('product-form');
const inventoryTable = document.getElementById('inventory-body');
const insightsContainer = document.getElementById('insights-container');
const exportBtn = document.getElementById('export-data-action');
const addProductBtn = document.getElementById('add-product-btn');
const addProductModal = document.getElementById('add-product-modal');
const closeModal = document.getElementById('close-modal');
const voicePanel = document.getElementById('voice-panel');
const voiceClose = document.getElementById('voice-close');
const startListen = document.getElementById('start-listen');
const navItems = document.querySelectorAll('.nav-item');

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Set user ID
    document.querySelector('.user-avatar').textContent = userID.charAt(0);
    
    // Initialize language
    updateLanguage(currentLang);
    
    // Initialize Speech Recognition
    initSpeechRecognition();
    
    // Load initial data
    fetchProducts();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize charts
    initializeCharts();
    
    // Setup navigation
    setupNavigation();
});

// Initialize Speech Recognition
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        document.getElementById('voice-status').textContent = currentLang === 'TA' ? 
            'உங்கள் உலாவி குரை அங்கீகரிப்பதை ஆதரிக்கவில்லை' : 
            'Your browser does not support speech recognition';
        return;
    }
    
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    
    recognition.onstart = () => {
        isListening = true;
        micBtn.classList.add('listening');
        voiceStatus.textContent = currentLang === 'TA' ? 
            'கேட்கிறது... பேசுங்கள்' : 
            'Listening... Speak now';
    };
    
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        processVoiceInput(transcript);
    };
    
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        voiceStatus.textContent = currentLang === 'TA' ? 
            'பிழை: ' + event.error : 
            'Error: ' + event.error;
        stopListening();
    };
    
    recognition.onend = () => {
        stopListening();
    };
}

// Stop listening and update UI
function stopListening() {
    isListening = false;
    micBtn.classList.remove('listening');
    if (currentField) {
        currentField = null;
    }
}

// Toggle Voice Input
function toggleVoiceInput() {
    if (isListening) {
        recognition.stop();
    } else {
        recognition.lang = currentLang === 'TA' ? 'ta-IN' : 'en-US';
        recognition.start();
    }
}

// Process Voice Input
function processVoiceInput(transcript) {
    console.log('Voice input:', transcript);
    
    // If specific field is targeted
    if (currentField) {
        switch(currentField) {
            case 'product-name':
                document.getElementById('product-name').value = transcript;
                break;
            case 'quantity':
                document.getElementById('quantity').value = extractQuantity(transcript, currentLang);
                break;
            case 'price':
                document.getElementById('price').value = extractPrice(transcript, currentLang);
                break;
        }
        currentField = null;
        return;
    }
    
    // Update status to show recognized command
    voiceStatus.textContent = currentLang === 'TA' ? 
        `அங்கீகரிக்கப்பட்டது: "${transcript}"` : 
        `Recognized: "${transcript}"`;
    
    // Process complex commands through backend
    fetch('/voice_command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            transcript: transcript, 
            lang: currentLang 
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.action === 'add_product') {
            // Fill the form with product details
            document.getElementById('product-name').value = data.product_name;
            document.getElementById('quantity').value = data.quantity;
            document.getElementById('price').value = data.price;
            
            // Auto-submit after delay
            setTimeout(() => {
                productForm.dispatchEvent(new Event('submit'));
            }, 1500);
        }
        else if (data.action === 'open_add_product') {
            setTimeout(() => {
                addProductBtn.click();
                showToast(currentLang === 'TA' ? 'புதிய பொருள் பிரிவு திறக்கப்பட்டது' : 'Add product section opened');
            }, 1000);
        }
        else if (data.action === 'filter_low_stock') {
            filterLowStock();
            showToast(currentLang === 'TA' ? 'குறைந்த சரக்கு பொருட்கள் காட்டப்படுகின்றன' : 'Showing low stock items');
        }
        else if (data.action === 'open_sales_report') {
            showSection('analysis');
            showToast(currentLang === 'TA' ? 'விற்பனை பகுப்பாய்வு திறக்கப்பட்டது' : 'Sales analytics opened');
        }
        else if (data.action === 'navigate_materials') {
            showSection('materials');
            showToast(currentLang === 'TA' ? 'பொருட்கள் பிரிவுக்கு மாற்றப்பட்டது' : 'Switched to materials section');
        }
        else if (data.action === 'open_analysis') {
            showSection('analysis');
            showToast(currentLang === 'TA' ? 'ஆய்வு அறிக்கை காட்டப்படுகிறது' : 'Showing analysis report');
        }
        else if (data.action === 'open_dashboard') {
            showSection('dashboard');
            showToast(currentLang === 'TA' ? 'டாஷ்போர்டு காட்டப்படுகிறது' : 'Showing dashboard');
        }
        else if (data.action === 'open_insights') {
            showSection('insights');
            showToast(currentLang === 'TA' ? 'AI பரிந்துரைகள் காட்டப்படுகின்றன' : 'Showing AI insights');
        }
        else if (data.action === 'open_settings') {
            showSection('settings');
            showToast(currentLang === 'TA' ? 'அமைப்புகள் பிரிவு திறக்கப்பட்டது' : 'Settings section opened');
        }
        else {
            voiceStatus.textContent = currentLang === 'TA' ? 
                `கட்டளையை அங்கீகரிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்` : 
                `Command not recognized. Please try again`;
        }
    })
    .catch(error => {
        console.error('Error processing voice command:', error);
        voiceStatus.textContent = currentLang === 'TA' ? 
            'கட்டளை செயலாக்கத்தில் பிழை' : 
            'Error processing command';
    });
}

// Tamil number words to digits mapping
const tamilNumbers = {
    'ஒன்று': 1, 'இரண்டு': 2, 'மூன்று': 3, 'நான்கு': 4, 'ஐந்து': 5,
    'ஆறு': 6, 'ஏழு': 7, 'எட்டு': 8, 'ஒன்பது': 9, 'பத்து': 10,
    'பதினொன்று': 11, 'பன்னிரண்டு': 12, 'பதிமூன்று': 13, 'பதினான்கு': 14, 'பதினைந்து': 15,
    'பதினாறு': 16, 'பதினேழு': 17, 'பதினெட்டு': 18, 'பத்தொன்பது': 19, 'இருபது': 20,
    'இருபத்தி ஒன்று': 21, 'இருபத்தி இரண்டு': 22, 'முப்பது': 30, 'நாற்பது': 40, 'ஐம்பது': 50,
    'அறுபது': 60, 'எழுபது': 70, 'எண்பது': 80, 'தொண்ணூறு': 90, 'நூறு': 100,
    'இருநூறு': 200, 'முன்னூறு': 300, 'நாநூறு': 400, 'ஐநூறு': 500, 'ஆறுநூறு': 600,
    'எழுநூறு': 700, 'எண்ணூறு': 800, 'தொள்ளாயிரம்': 900, 'ஆயிரம்': 1000
};

// Extract quantity from input text
function extractQuantity(input, lang) {
    if (lang === 'TA') {
        // Check for Tamil number words
        for (const [word, num] of Object.entries(tamilNumbers)) {
            if (input.includes(word)) {
                return num;
            }
        }
    }
    
    // Look for digits
    const numbers = input.match(/\d+/g) || [];
    return numbers.length > 0 ? parseInt(numbers[0]) : 1;
}

// Extract price from input text
function extractPrice(input, lang) {
    if (lang === 'TA') {
        // Check for Tamil number words with currency context
        for (const [word, num] of Object.entries(tamilNumbers)) {
            if (input.includes(word) && (input.includes('ரூபாய்') || input.includes('ரூ'))) {
                return num;
            }
        }
    }
    
    // Look for currency patterns
    const matches = input.match(/(\d+)\s*(ரூபாய்|ரூ|rupees?|rs|₹)/i) || input.match(/\d+/g) || [];
    return matches.length > 0 ? parseInt(matches[0]) : 1000;
}

// Filter low stock items
function filterLowStock() {
    const lowStockProducts = products.filter(p => p.quantity < 5);
    products = lowStockProducts;
    renderInventory();
}

// Setup event listeners
function setupEventListeners() {
    // Language toggle
    langToggleBtn.addEventListener('click', toggleLanguage);
    
    // Voice button
    micBtn.addEventListener('click', toggleVoiceInput);
    
    // Add product button
    addProductBtn.addEventListener('click', () => {
        addProductModal.style.display = 'flex';
    });
    
    // Close modal button
    closeModal.addEventListener('click', () => {
        addProductModal.style.display = 'none';
    });
    
    // Form submission
    productForm.addEventListener('submit', addProduct);
    
    // Mic buttons for specific fields
    document.querySelectorAll('.mic-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const field = e.target.closest('.mic-btn').getAttribute('data-for');
            currentField = field;
            recognition.lang = currentLang === 'TA' ? 'ta-IN' : 'en-US';
            recognition.start();
        });
    });
    
    // Voice panel
    micBtn.addEventListener('click', () => {
        voicePanel.style.display = voicePanel.style.display === 'block' ? 'none' : 'block';
    });
    
    voiceClose.addEventListener('click', () => {
        voicePanel.style.display = 'none';
    });
    
    startListen.addEventListener('click', toggleVoiceInput);
    
    // Export button
    exportBtn.addEventListener('click', () => {
        window.location.href = '/download_excel';
    });
}

// Setup navigation
function setupNavigation() {
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Get section to show
            const section = this.getAttribute('data-section');
            showSection(section);
        });
    });
}

// Show specific section
function showSection(section) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(sec => {
        sec.classList.remove('active');
    });
    
    // Show requested section
    document.getElementById(`${section}-section`).classList.add('active');
}

// Toggle language
function toggleLanguage() {
    currentLang = currentLang === 'TA' ? 'EN' : 'TA';
    localStorage.setItem('artisanLang', currentLang);
    updateLanguage(currentLang);
    fetchProducts();
}

// Update UI Language
function updateLanguage(lang) {
    // Update UI text elements
    const elements = {
        'welcome-title': lang === 'TA' ? 'வரவேற்கிறோம், தமிழன்!' : 'Welcome, Artisan!',
        'welcome-text': lang === 'TA' ? 'உங்கள் கைவினைப் பொருட்களை நிர்வகிக்க இந்த ஸ்மார்ட் டாஷ்போர்டு உதவும். குரல் உள்ளீடு, AI பரிந்துரைகள் மற்றும் எளிய நிர்வாகம் ஆகியவற்றைப் பயன்படுத்தி உங்கள் வணிகத்தை வளர்க்கவும்.' : 'This smart dashboard helps you manage your handicraft products. Use voice input, AI suggestions, and simple management to grow your business.',
        'guide-text': lang === 'TA' ? 'வழிகாட்டி வீடியோவைப் பார்க்கவும்' : 'View Guide Video',
        'products-title': lang === 'TA' ? 'உங்கள் பொருட்கள்' : 'Your Products',
        'insights-title': lang === 'TA' ? 'AI பரிந்துரைகள்' : 'AI Insights',
        'sales-title': lang === 'TA' ? 'விற்பனை பகுப்பாய்வு' : 'Sales Analytics',
        'category-title': lang === 'TA' ? 'வகை வாரியான விற்பனை' : 'Category Sales',
        'add-product-text': lang === 'TA' ? 'புதிய பொருள்' : 'New Product',
        'filter-text': lang === 'TA' ? 'வடிகட்டு' : 'Filter',
        'refresh-text': lang === 'TA' ? 'புதுப்பி' : 'Refresh',
        'modal-title': lang === 'TA' ? 'புதிய பொருளைச் சேர்க்கவும்' : 'Add New Product',
        'name-label': lang === 'TA' ? 'பொருளின் பெயர்' : 'Product Name',
        'qty-label': lang === 'TA' ? 'அளவு' : 'Quantity',
        'price-label': lang === 'TA' ? 'விலை (₹)' : 'Price (₹)',
        'save-text': lang === 'TA' ? 'சேமிக்கவும்' : 'Save Product',
        'voice-panel-title': lang === 'TA' ? 'குரை உதவியாளர்' : 'Voice Assistant',
        'start-listen-text': lang === 'TA' ? 'கேட்கத் தொடங்கு' : 'Start Listening',
        'commands-title': lang === 'TA' ? 'எடுத்துக்காட்டு கட்டளைகள்:' : 'Example Commands:',
        'sync-text': lang === 'TA' ? 'டேட்டாவை ஒத்திசைக்கவும்' : 'Sync Data',
        'lang-text': lang === 'TA' ? 'தமிழ்' : 'English',
        'notifications-text': lang === 'TA' ? 'அறிவிப்புகள்' : 'Notifications',
        'main-menu-text': lang === 'TA' ? 'முதன்மை பட்டி' : 'Main Menu',
        'dashboard-text': lang === 'TA' ? 'டாஷ்போர்டு' : 'Dashboard',
        'materials-text': lang === 'TA' ? 'பொருட்கள்' : 'Materials',
        'analysis-text': lang === 'TA' ? 'ஆய்வு' : 'Analysis',
        'insights-menu-text': lang === 'TA' ? 'AI பரிந்துரைகள்' : 'AI Insights',
        'settings-text': lang === 'TA' ? 'அமைப்புகள்' : 'Settings',
        'quick-actions-text': lang === 'TA' ? 'விரைவு செயல்கள்' : 'Quick Actions',
        'add-product-action-text': lang === 'TA' ? 'புதிய பொருள் சேர்' : 'Add Product',
        'export-text': lang === 'TA' ? 'டேட்டாவை ஏற்றுமதி செய்க' : 'Export Data',
        'help-text': lang === 'TA' ? 'உதவி மையம்' : 'Help Center',
        'command1': lang === 'TA' ? '"புதிய பொருள் சேர்"' : '"add new product"',
        'command2': lang === 'TA' ? '"தஞ்சாவூர் பிளேட் ஐந்து 1200 ரூபாய்"' : '"Thanjavur plate five 1200 rupees"',
        'command3': lang === 'TA' ? '"குறைந்த சரக்கு காட்டு"' : '"show low stock"',
        'command4': lang === 'TA' ? '"விற்பனை அறிக்கை திற"' : '"open sales report"',
        'command5': lang === 'TA' ? '"பொருட்கள் பிரிவுக்கு செல்"' : '"go to materials"',
        'command6': lang === 'TA' ? '"ஆய்வு அறிக்கை காட்டு"' : '"show analysis report"',
        '7-days': lang === 'TA' ? 'கடந்த 7 நாட்கள்' : 'Last 7 Days',
        '30-days': lang === 'TA' ? 'கடந்த 30 நாட்கள்' : 'Last 30 Days',
        '90-days': lang === 'TA' ? 'கடந்த 90 நாட்கள்' : 'Last 90 Days',
        'materials-title': lang === 'TA' ? 'பொருட்கள் சரக்கு' : 'Materials Inventory',
        'add-material-text': lang === 'TA' ? 'புதிய பொருள் சேர்' : 'Add Material',
        'ai-insights-title': lang === 'TA' ? 'AI பரிந்துரைகள்' : 'AI Insights & Recommendations'
    };
    
    Object.keys(elements).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = elements[id];
        }
    });
    
    // Update stats labels
    document.getElementById('total-products-label').textContent = lang === 'TA' ? 'மொத்த பொருட்கள்' : 'Total Products';
    document.getElementById('revenue-label').textContent = lang === 'TA' ? 'மாத வருவாய்' : 'Monthly Revenue';
    document.getElementById('sales-rate-label').textContent = lang === 'TA' ? 'விற்பனை விகிதம்' : 'Sales Rate';
    document.getElementById('orders-label').textContent = lang === 'TA' ? 'புதிய ஆர்டர்கள்' : 'New Orders';
    
    // Update table headers
    document.getElementById('col-product').textContent = lang === 'TA' ? 'பொருள்' : 'Product';
    document.getElementById('col-category').textContent = lang === 'TA' ? 'வகை' : 'Category';
    document.getElementById('col-quantity').textContent = lang === 'TA' ? 'அளவு' : 'Quantity';
    document.getElementById('col-price').textContent = lang === 'TA' ? 'விலை' : 'Price';
    document.getElementById('col-status').textContent = lang === 'TA' ? 'நிலை' : 'Status';
    document.getElementById('col-actions').textContent = lang === 'TA' ? 'செயல்கள்' : 'Actions';
}

// Add Product
function addProduct(e) {
    e.preventDefault();
    
    const productName = document.getElementById('product-name').value;
    const quantity = parseInt(document.getElementById('quantity').value);
    const price = parseInt(document.getElementById('price').value);
    
    if (!productName) {
        showToast(currentLang === 'TA' ? 'தயவு செய்து பொருளின் பெயரை உள்ளிடவும்' : 'Please enter a product name', true);
        return;
    }
    
    // Show loading state
    const submitBtn = document.querySelector('#product-form button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = currentLang === 'TA' ? 
        '<i class="fas fa-spinner fa-spin"></i> சேமிக்கிறது...' : 
        '<i class="fas fa-spinner fa-spin"></i> Saving...';
    
    // Send to backend
    fetch('/add_product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: productName, quantity, price })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success message
            showToast(currentLang === 'TA' ? 
                'பொருள் வெற்றிகரமாக சேர்க்கப்பட்டது!' : 
                'Product added successfully!');
            
            // Clear form
            productForm.reset();
            
            // Close modal
            addProductModal.style.display = 'none';
            
            // Refresh products
            fetchProducts();
        }
    })
    .catch(error => {
        console.error('Error adding product:', error);
        showToast(currentLang === 'TA' ? 
            'பிழை: பொருளை சேர்க்க முடியவில்லை' : 
            'Error: Could not add product', true);
    })
    .finally(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = currentLang === 'TA' ? 
            '<i class="fas fa-save"></i> சேமிக்கவும்' : 
            '<i class="fas fa-save"></i> Save Product';
    });
}

// Fetch Products
function fetchProducts() {
    fetch('/get_products')
    .then(response => response.json())
    .then(data => {
        products = data;
        renderInventory();
        generateInsights();
        updateStats();
    })
    .catch(error => {
        console.error('Error fetching products:', error);
    });
}

// Update Stats
function updateStats() {
    document.getElementById('total-products').textContent = products.length;
    
    // Calculate total revenue (dummy data for demo)
    const revenue = products.reduce((sum, product) => sum + (product.price * product.quantity), 0);
    document.getElementById('total-revenue').textContent = '₹' + revenue.toLocaleString();
    
    // Dummy values for other stats
    document.getElementById('sales-rate').textContent = '87%';
    document.getElementById('new-orders').textContent = '24';
}

// Render Inventory
function renderInventory() {
    const tableBody = document.getElementById('inventory-body');
    tableBody.innerHTML = '';
    
    if (products.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem;">
                    ${currentLang === 'TA' ? 
                        'பொருட்கள் எதுவும் கிடைக்கவில்லை. புதிய பொருளைச் சேர்க்கவும்' : 
                        'No products found. Add your first product!'}
                </td>
            </tr>
        `;
        return;
    }
    
    products.forEach(product => {
        // Determine stock status
        let stockStatus = '';
        let stockClass = '';
        if (product.quantity < 5) {
            stockStatus = currentLang === 'TA' ? 'குறைவு' : 'Low';
            stockClass = 'stock-low';
        } else if (product.quantity < 10) {
            stockStatus = currentLang === 'TA' ? 'சராசரி' : 'Medium';
            stockClass = 'stock-medium';
        } else {
            stockStatus = currentLang === 'TA' ? 'போதுமானது' : 'Sufficient';
            stockClass = 'stock-high';
        }
        
        // Get icon based on category
        let icon = 'fa-box';
        if (product.category.includes('Textile') || product.category.includes('Saree')) {
            icon = 'fa-tshirt';
        } else if (product.category.includes('Clay') || product.category.includes('Pottery')) {
            icon = 'fa-mug-hot';
        } else if (product.category.includes('Metal')) {
            icon = 'fa-gem';
        } else if (product.category.includes('Jewelry')) {
            icon = 'fa-ring';
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <div class="product-cell">
                    <div class="product-img">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="product-info">
                        <div class="product-name">${product.name}</div>
                        <div class="product-category">${product.category}</div>
                    </div>
                </div>
            </td>
            <td>${product.category}</td>
            <td>${product.quantity}</td>
            <td>₹${product.price}</td>
            <td>
                <span class="stock-badge ${stockClass}">${stockStatus}</span>
            </td>
            <td>
                <div class="action-cell">
                    <div class="action-btn edit-btn">
                        <i class="fas fa-edit"></i>
                    </div>
                    <div class="action-btn delete-btn" data-id="${product.id}">
                        <i class="fas fa-trash"></i>
                    </div>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners for delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const productId = e.target.closest('.delete-btn').getAttribute('data-id');
            deleteProduct(productId);
        });
    });
}

// Delete Product
function deleteProduct(productId) {
    if (confirm(currentLang === 'TA' ? 
        `இந்தப் பொருளை நீக்க விரும்புகிறீர்களா?` : 
        `Are you sure you want to delete this product?`)) {
        
        fetch(`/delete_product/${productId}`, { method: 'DELETE' })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast(currentLang === 'TA' ? 
                    'பொருள் நீக்கப்பட்டது!' : 
                    'Product deleted!');
                fetchProducts();
            }
        })
        .catch(error => {
            console.error('Error deleting product:', error);
            showToast(currentLang === 'TA' ? 
                'பிழை: பொருளை நீக்க முடியவில்லை' : 
                'Error: Could not delete product', true);
        });
    }
}

// Generate AI Insights
function generateInsights() {
    const insightsContainer = document.getElementById('insights-container');
    insightsContainer.innerHTML = '';
    
    // Low stock insight
    const lowStockProducts = products.filter(p => p.quantity < 5);
    if (lowStockProducts.length > 0) {
        const productNames = lowStockProducts.map(p => p.name).join(', ');
        insightsContainer.innerHTML += `
            <div class="insight-card warning">
                <div class="insight-header">
                    <div class="insight-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="insight-title">
                        ${currentLang === 'TA' ? 'குறைந்த சரக்கு எச்சரிக்கை' : 'Low Stock Warning'}
                    </div>
                </div>
                <div class="insight-content">
                    ${currentLang === 'TA' ? 
                        `${productNames} - இவற்றின் அளவு குறைவாக உள்ளது. உடனடியாக உற்பத்தி செய்ய பரிந்துரைக்கப்படுகிறது.` : 
                        `${productNames} - are running low. Consider restocking immediately.`}
                </div>
                <div class="insight-actions">
                    <button class="btn btn-outline">
                        ${currentLang === 'TA' ? 'விவரங்கள்' : 'Details'}
                    </button>
                </div>
            </div>
        `;
    }
    
    // High demand insight
    const highDemandProducts = products.filter(p => p.quantity < 10 && p.price < 1000);
    if (highDemandProducts.length > 0) {
        const productNames = highDemandProducts.map(p => p.name).join(', ');
        insightsContainer.innerHTML += `
            <div class="insight-card success">
                <div class="insight-header">
                    <div class="insight-icon">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="insight-title">
                        ${currentLang === 'TA' ? 'அதிக தேவை உள்ள பொருள்' : 'High Demand Products'}
                    </div>
                </div>
                <div class="insight-content">
                    ${currentLang === 'TA' ? 
                        `${productNames} - இவற்றிற்கு சமீபத்தில் அதிக தேவை உள்ளது. உற்பத்தியை அதிகரிக்கலாம்.` : 
                        `${productNames} - have high recent demand. Consider increasing production.`}
                </div>
                <div class="insight-actions">
                    <button class="btn btn-outline">
                        ${currentLang === 'TA' ? 'பகுப்பாய்வு' : 'Analyze'}
                    </button>
                </div>
            </div>
        `;
    }
    
    // Pricing insight
    const expensiveProducts = products.filter(p => p.price > 5000);
    if (expensiveProducts.length > 0) {
        const productNames = expensiveProducts.map(p => p.name).join(', ');
        insightsContainer.innerHTML += `
            <div class="insight-card info">
                <div class="insight-header">
                    <div class="insight-icon">
                        <i class="fas fa-tags"></i>
                    </div>
                    <div class="insight-title">
                        ${currentLang === 'TA' ? 'விலை சரிசெய்தல்' : 'Pricing Adjustment'}
                    </div>
                </div>
                <div class="insight-content">
                    ${currentLang === 'TA' ? 
                        `${productNames} - இவற்றின் சராசரி சந்தை விலையுடன் ஒப்பிடும்போது உங்கள் விலை அதிகமாக உள்ளது.` : 
                        `${productNames} - your pricing is higher compared to market average.`}
                </div>
                <div class="insight-actions">
                    <button class="btn btn-outline">
                        ${currentLang === 'TA' ? 'சரிசெய்' : 'Adjust'}
                    </button>
                </div>
            </div>
        `;
    }
    
    // Festival insight
    insightsContainer.innerHTML += `
        <div class="insight-card info">
            <div class="insight-header">
                <div class="insight-icon">
                    <i class="fas fa-calendar-alt"></i>
                </div>
                <div class="insight-title">
                    ${currentLang === 'TA' ? 'திருவிழா தயாரிப்பு' : 'Festival Preparation'}
                </div>
            </div>
            <div class="insight-content">
                ${currentLang === 'TA' ? 
                    'தீபாவளிக்கு 45 நாட்கள் மீதமுள்ளன. இந்த காலகட்டத்தில் பட்டுப் புடவைகள் மற்றும் களிமண் விளக்குகளுக்கு அதிக தேவை உள்ளது.' : 
                    'Diwali is in 45 days. Sarees and terracotta lamps have high demand during this period.'}
            </div>
            <div class="insight-actions">
                <button class="btn btn-outline">
                    ${currentLang === 'TA' ? 'திட்டமிடு' : 'Plan'}
                </button>
            </div>
        </div>
    `;
}

// Initialize Charts
function initializeCharts() {
    // Sales Chart
    const salesCtx = document.getElementById('salesChart').getContext('2d');
    const salesChart = new Chart(salesCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
            datasets: [{
                label: currentLang === 'TA' ? 'மாத விற்பனை (₹)' : 'Monthly Sales (₹)',
                data: [85000, 102000, 98000, 115000, 124850, 110200, 132500],
                borderColor: '#8f94fb',
                backgroundColor: 'rgba(143, 148, 251, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: '#ff7e5f',
                pointRadius: 5,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        callback: function(value) {
                            return '₹' + value.toLocaleString();
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
    
    // Category Chart
    const categoryCtx = document.getElementById('categoryChart').getContext('2d');
    const categoryChart = new Chart(categoryCtx, {
        type: 'doughnut',
        data: {
            labels: currentLang === 'TA' ? 
                ['புடவைகள்', 'மட்பாண்டம்', 'உலோகக் கைவினை', 'நகைகள்', 'பிற'] : 
                ['Sarees', 'Pottery', 'Metal Craft', 'Jewelry', 'Others'],
            datasets: [{
                data: [35, 20, 25, 15, 5],
                backgroundColor: [
                    '#4e54c8',
                    '#ff7e5f',
                    '#8f94fb',
                    '#4caf50',
                    '#ff9966'
                ],
                borderWidth: 0,
                hoverOffset: 15
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 15,
                        padding: 20
                    }
                }
            },
            cutout: '65%'
        }
    });
    
    // Trend Chart (for Analysis section)
    const trendCtx = document.getElementById('trendChart').getContext('2d');
    const trendChart = new Chart(trendCtx, {
        type: 'bar',
        data: {
            labels: currentLang === 'TA' ? 
                ['ஜன', 'பிப்', 'மார்', 'ஏப்', 'மே', 'ஜூன்'] : 
                ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: currentLang === 'TA' ? 'விற்பனை வளர்ச்சி' : 'Sales Growth',
                data: [120, 150, 180, 90, 200, 240],
                backgroundColor: '#8f94fb',
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
    
    // Revenue Chart (for Analysis section)
    const revenueCtx = document.getElementById('revenueChart').getContext('2d');
    const revenueChart = new Chart(revenueCtx, {
        type: 'pie',
        data: {
            labels: currentLang === 'TA' ? 
                ['பட்டு', 'உலோகம்', 'மட்பாண்டம்', 'மரம்'] : 
                ['Silk', 'Metal', 'Pottery', 'Wood'],
            datasets: [{
                data: [40, 30, 20, 10],
                backgroundColor: [
                    '#4e54c8',
                    '#ff7e5f',
                    '#8f94fb',
                    '#4caf50'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Show Toast Notification
function showToast(message, isError = false) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast' + (isError ? ' error' : '');
    toast.textContent = message;
    
    // Add to body
    document.body.appendChild(toast);
    
    // Trigger reflow
    void toast.offsetWidth;
    
    // Show toast
    toast.classList.add('show');
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}