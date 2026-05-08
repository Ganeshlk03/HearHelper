// Global variable to store location watch ID
let locationWatchId = null;

// Security Helper: Escape HTML to prevent XSS
function escapeHTML(str) {
    if (!str) return "";
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function initializeEmergencyPage() {
    // Load saved emergency contacts
    loadEmergencyContacts();

    // Set up form submissions
    setupEmergencyForms();

    // Initialize location services
    initializeLocationServices();
}

function setupEmergencyForms() {
    // Emergency alert form
    const emergencyForm = document.getElementById('emergencyForm');
    if (emergencyForm) {
        emergencyForm.addEventListener('submit', sendEmergencyAlert);
    }

    // Add contact form
    const addContactForm = document.getElementById('addContactForm');
    if (addContactForm) {
        addContactForm.addEventListener('submit', addEmergencyContact);
    }
}

// Emergency type selection
function selectEmergencyType(type) {
    const alertTypeInput = document.getElementById('alertType');
    if (alertTypeInput) {
        alertTypeInput.value = type;

        // Visual feedback - highlight selected button
        const buttons = document.querySelectorAll('.btn-emergency-ambulance, .btn-emergency-police, .btn-emergency-fire');
        buttons.forEach(btn => btn.classList.remove('selected'));

        const selectedButton = document.querySelector(`.btn-emergency-${type}`);
        if (selectedButton) {
            selectedButton.classList.add('selected');
        }

        showAlert(`Selected: ${type.charAt(0).toUpperCase() + type.slice(1)} emergency services`, 'info');
    }
}

// Location services
function initializeLocationServices() {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
        showAlert('Geolocation is not supported by this browser', 'error');
        return;
    }

    // Add a refresh location button
    const locationBtn = document.getElementById('getLocationBtn');
    if (locationBtn) {
        // Add double-click to force refresh
        locationBtn.addEventListener('dblclick', () => {
            if (confirm('Force refresh location? This will clear any cached location data.')) {
                forceLocationRefresh();
            }
        });
    }
}

function forceLocationRefresh() {
    // Clear any cached location
    window.currentLocation = null;

    // Hide location display
    const locationDisplay = document.getElementById('locationDisplay');
    if (locationDisplay) {
        locationDisplay.style.display = 'none';
    }

    // Force new location request
    getLocationWithAddress();
}

function getLocationWithAddress() {
    const locationBtn = document.getElementById('getLocationBtn');
    const locationDisplay = document.getElementById('locationDisplay');
    const addressText = document.getElementById('addressText');
    const coordinatesText = document.getElementById('coordinatesText');
    const accuracyText = document.getElementById('accuracyText');
    const locationSource = document.getElementById('locationSource');

    if (!locationBtn || !locationDisplay) return;

    // Show loading state
    locationBtn.innerHTML = '📍 Getting Location...';
    locationBtn.disabled = true;

    // Clear any existing location watch
    if (locationWatchId !== null) {
        navigator.geolocation.clearWatch(locationWatchId);
        locationWatchId = null;
    }

    console.log('Requesting location with high accuracy...');

    locationWatchId = navigator.geolocation.watchPosition(
        async (position) => {
            const { latitude, longitude, accuracy } = position.coords;

            console.log('Location obtained:', {
                latitude,
                longitude,
                accuracy,
                timestamp: position.timestamp,
                expectedIndia: latitude > 8 && latitude < 37 && longitude > 68 && longitude < 97 ? 'YES' : 'NO'
            });

            // Validate coordinates are in reasonable range for India
            const isInIndia = latitude >= 8.4 && latitude <= 37.6 && longitude >= 68.7 && longitude <= 97.25;
            if (!isInIndia) {
                console.warn('Coordinates do not appear to be in India:', { latitude, longitude });
                showAlert('GPS coordinates appear incorrect. Trying IP-based location...', 'info');

                if (ipLocation && ipLocation.latitude && ipLocation.longitude) {
                    console.log('Using IP-based location instead:', ipLocation);
                    latitude = ipLocation.latitude;
                    longitude = ipLocation.longitude;
                    accuracy = ipLocation.accuracy;
                    showAlert(`Using IP-based location (${ipLocation.city}, ${ipLocation.country})`, 'info');
                } else {
                    showAlert('Warning: Location coordinates do not appear to be in India. Please check VPN/proxy settings.', 'error');
                }
            }

            // Stop watching after first good position
            if (locationWatchId !== null) {
                navigator.geolocation.clearWatch(locationWatchId);
                locationWatchId = null;
            }

            // Display coordinates
            coordinatesText.textContent = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            accuracyText.textContent = `±${Math.round(accuracy)} meters`;
            locationSource.textContent = window.currentLocation?.source === 'IP' ? 'IP Address' : 'GPS';

            // Try to get address using reverse geocoding
            try {
                addressText.textContent = 'Getting address...';
                const address = await reverseGeocode(latitude, longitude);
                addressText.textContent = address;
            } catch (error) {
                console.error('Reverse geocoding failed:', error);
                addressText.textContent = 'Address lookup failed - coordinates shown above';
            }

            // Show location display
            locationDisplay.style.display = 'block';

            // Store location data for emergency alert
            window.currentLocation = {
                latitude,
                longitude,
                accuracy,
                timestamp: new Date().toISOString()
            };

            // Reset button
            locationBtn.innerHTML = '📍 Location Updated';
            locationBtn.disabled = false;

            showAlert('Location obtained successfully', 'success');
        },
        (error) => {
            console.error('Geolocation error:', {
                code: error.code,
                message: error.message,
                PERMISSION_DENIED: error.PERMISSION_DENIED,
                POSITION_UNAVAILABLE: error.POSITION_UNAVAILABLE,
                TIMEOUT: error.TIMEOUT
            });

            let errorMessage = 'Unable to get location';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Location access denied. Please enable location permissions in your browser settings and refresh the page.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Location information unavailable. Please check your GPS/network connection and try again.';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Location request timed out. Please try again or check your internet connection.';
                    break;
            }

            showAlert(errorMessage, 'error');

            // Reset button
            locationBtn.innerHTML = '📍 Get My Location';
            locationBtn.disabled = false;

            // Clear watch
            if (locationWatchId !== null) {
                navigator.geolocation.clearWatch(locationWatchId);
                locationWatchId = null;
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 20000, // Increased timeout
            maximumAge: 0 // Force fresh location, don't use cached data
        }
    );
}

async function reverseGeocode(lat, lng) {
    console.log('Reverse geocoding coordinates:', lat, lng);

    // Try OpenStreetMap Nominatim first
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'HearHelper-Emergency/1.0'
                }
            }
        );

        if (!response.ok) {
            throw new Error('Nominatim request failed');
        }

        const data = await response.json();
        console.log('Nominatim response:', data);

        if (data && data.display_name) {
            return data.display_name;
        }
    } catch (error) {
        console.warn('Nominatim geocoding failed:', error);
    }

    // Fallback: Try Google Maps (requires API key, but we'll use a basic fallback)
    try {
        // Note: This is a fallback that might not work without API key
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=`
        );

        if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                return data.results[0].formatted_address;
            }
        }
    } catch (error) {
        console.warn('Google Maps geocoding failed:', error);
    }

    // Final fallback: Return coordinates as string
    return `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

// Emergency alert submission
async function sendEmergencyAlert(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    const alertData = {
        alertType: formData.get('alertType'),
        location: window.currentLocation || null,
        contactName: formData.get('contactName'),
        contactPhone: formData.get('contactPhone'),
        contactEmail: formData.get('contactEmail'),
        emergencyMessage: formData.get('emergencyMessage')
    };

    // Validation
    if (!alertData.alertType) {
        showAlert('Please select an emergency type', 'error');
        return;
    }

    if (!alertData.contactName || !alertData.contactPhone || !alertData.emergencyMessage) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/emergency/alert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(alertData)
        });

        const result = await response.json();

        if (result.success) {
            showAlert(result.message, 'success');
            form.reset();
            document.getElementById('alertType').value = '';

            // Reset button highlights
            const buttons = document.querySelectorAll('.btn-emergency-ambulance, .btn-emergency-police, .btn-emergency-fire');
            buttons.forEach(btn => btn.classList.remove('selected'));

            // Clear location data
            window.currentLocation = null;
            const locationDisplay = document.getElementById('locationDisplay');
            if (locationDisplay) {
                locationDisplay.style.display = 'none';
            }
        } else {
            showAlert(result.message || 'Failed to send emergency alert', 'error');
        }
    } catch (error) {
        console.error('Error sending emergency alert:', error);
        showAlert('Failed to send emergency alert. Please check your connection.', 'error');
    }
}

// Emergency contacts management
async function addEmergencyContact(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    const contactData = {
        contactName: formData.get('newContactName'),
        contactPhone: formData.get('newContactPhone'),
        contactEmail: formData.get('newContactEmail')
    };

    // Validation
    if (!contactData.contactName || !contactData.contactPhone) {
        showAlert('Contact name and phone are required', 'error');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/api/emergency/contacts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(contactData)
        });

        const result = await response.json();

        if (result.success) {
            showAlert(result.message, 'success');
            form.reset();
            loadEmergencyContacts(); // Refresh the contacts list
        } else {
            showAlert(result.message || 'Failed to add contact', 'error');
        }
    } catch (error) {
        console.error('Error adding emergency contact:', error);
        showAlert('Failed to add contact. Please check your connection.', 'error');
    }
}

async function loadEmergencyContacts() {
    try {
        const response = await fetch('http://localhost:3000/api/emergency/contacts');
        const result = await response.json();

        if (result.success) {
            displayEmergencyContacts(result.contacts);
        } else {
            console.error('Failed to load contacts:', result.message);
        }
    } catch (error) {
        console.error('Error loading emergency contacts:', error);
    }
}

function displayEmergencyContacts(contacts) {
    const contactsList = document.getElementById('contactsList');
    if (!contactsList) return;

    if (contacts.length === 0) {
        contactsList.innerHTML = `
            <li style="text-align: center; color: #95a5a6; padding: 2rem; font-style: italic;">
                No emergency contacts saved yet. Add one above.
            </li>
        `;
        return;
    }

    contactsList.innerHTML = contacts.map(contact => `
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 0.5rem; background: #f8f9fa;">
            <div>
                <strong style="color: #2c3e50;">${escapeHTML(contact.contactName)}</strong><br>
                <span style="color: #7f8c8d;">📱 ${escapeHTML(contact.contactPhone)}</span>
                ${contact.contactEmail ? `<br><span style="color: #7f8c8d;">📧 ${escapeHTML(contact.contactEmail)}</span>` : ''}
            </div>
            <button onclick="deleteEmergencyContact('${contact.id}')" style="background: #e74c3c; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">
                Delete
            </button>
        </li>
    `).join('');
}

async function deleteEmergencyContact(contactId) {
    if (!confirm('Are you sure you want to delete this emergency contact?')) {
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/emergency/contacts/${contactId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            showAlert(result.message, 'success');
            loadEmergencyContacts(); // Refresh the list
        } else {
            showAlert(result.message || 'Failed to delete contact', 'error');
        }
    } catch (error) {
        console.error('Error deleting emergency contact:', error);
        showAlert('Failed to delete contact. Please check your connection.', 'error');
    }
}

// Alert/notification system
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    alert.appendChild(messageSpan);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = "background: none; border: none; color: inherit; float: right; font-size: 1.2rem; cursor: pointer; margin-left: 1rem;";
    closeBtn.onclick = () => alert.remove();
    alert.appendChild(closeBtn);

    alertContainer.appendChild(alert);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alert.parentElement) {
            alert.remove();
        }
    }, 5000);
}

function showManualLocationInput() {
    const addressInput = `
        <div style="margin-top: 1rem; padding: 1rem; background: #f8f9fa; border-radius: 8px; border: 1px solid #ddd;">
            <h4 style="margin: 0 0 1rem 0; color: #2c3e50;">📍 Enter Your Location</h4>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">State:</label>
                    <select id="manualState" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" onchange="populateDistricts()">
                        <option value="">Select State</option>
                        <option value="Andhra Pradesh">Andhra Pradesh</option>
                        <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                        <option value="Assam">Assam</option>
                        <option value="Bihar">Bihar</option>
                        <option value="Chhattisgarh">Chhattisgarh</option>
                        <option value="Goa">Goa</option>
                        <option value="Gujarat">Gujarat</option>
                        <option value="Haryana">Haryana</option>
                        <option value="Himachal Pradesh">Himachal Pradesh</option>
                        <option value="Jharkhand">Jharkhand</option>
                        <option value="Karnataka">Karnataka</option>
                        <option value="Kerala">Kerala</option>
                        <option value="Madhya Pradesh">Madhya Pradesh</option>
                        <option value="Maharashtra">Maharashtra</option>
                        <option value="Manipur">Manipur</option>
                        <option value="Meghalaya">Meghalaya</option>
                        <option value="Mizoram">Mizoram</option>
                        <option value="Nagaland">Nagaland</option>
                        <option value="Odisha">Odisha</option>
                        <option value="Punjab">Punjab</option>
                        <option value="Rajasthan">Rajasthan</option>
                        <option value="Sikkim">Sikkim</option>
                        <option value="Tamil Nadu">Tamil Nadu</option>
                        <option value="Telangana">Telangana</option>
                        <option value="Tripura">Tripura</option>
                        <option value="Uttar Pradesh">Uttar Pradesh</option>
                        <option value="Uttarakhand">Uttarakhand</option>
                        <option value="West Bengal">West Bengal</option>
                        <option value="Delhi">Delhi</option>
                        <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                        <option value="Ladakh">Ladakh</option>
                        <option value="Puducherry">Puducherry</option>
                        <option value="Chandigarh">Chandigarh</option>
                        <option value="Andaman and Nicobar Islands">Andaman and Nicobar Islands</option>
                        <option value="Dadra and Nagar Haveli and Daman and Diu">Dadra and Nagar Haveli and Daman and Diu</option>
                        <option value="Lakshadweep">Lakshadweep</option>
                    </select>
                </div>
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">District:</label>
                    <select id="manualDistrict" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" disabled>
                        <option value="">Select District</option>
                    </select>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Taluk/Tehsil:</label>
                    <input type="text" id="manualTaluk" placeholder="e.g., Bangalore North" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div>
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Village/City:</label>
                    <input type="text" id="manualVillage" placeholder="e.g., Whitefield" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                </div>
            </div>

            <div style="margin-bottom: 1rem;">
                <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Additional Address Details:</label>
                <textarea id="manualAddress" rows="2" placeholder="e.g., Near ITPL Main Road, Opposite Forum Mall, Whitefield, Bangalore" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; resize: vertical;"></textarea>
            </div>

            <button class="btn btn-primary" onclick="geocodeAddress()" style="width: 100%;">🔍 Find Location</button>
            <button class="btn btn-secondary" onclick="hideManualLocationInput()" style="width: 100%; margin-top: 0.5rem;">Cancel</button>
        </div>
    `;

    const locationCard = document.querySelector('.card:has(#getLocationBtn)');
    const existingManual = locationCard.querySelector('.manual-location-input');
    if (existingManual) {
        existingManual.remove();
    }

    const manualDiv = document.createElement('div');
    manualDiv.className = 'manual-location-input';
    manualDiv.innerHTML = addressInput;
    locationCard.appendChild(manualDiv);
}

function hideManualLocationInput() {
    const manualInput = document.querySelector('.manual-location-input');
    if (manualInput) {
        manualInput.remove();
    }
}

function setManualLocation() {
    const lat = parseFloat(document.getElementById('manualLat').value);
    const lng = parseFloat(document.getElementById('manualLng').value);

    if (!lat || !lng || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        showAlert('Please enter valid latitude (-90 to 90) and longitude (-180 to 180)', 'error');
        return;
    }

    console.log('Setting manual location:', { lat, lng });

    // Update display
    const locationDisplay = document.getElementById('locationDisplay');
    const addressText = document.getElementById('addressText');
    const coordinatesText = document.getElementById('coordinatesText');
    const accuracyText = document.getElementById('accuracyText');

    coordinatesText.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    accuracyText.textContent = 'Manual entry (exact)';
    locationSource.textContent = 'Manual';

    // Try to get address
    reverseGeocode(lat, lng).then(address => {
        addressText.textContent = address;
    }).catch(() => {
        addressText.textContent = 'Manual location set';
    });

    // Show display and store location
    locationDisplay.style.display = 'block';
    window.currentLocation = {
        latitude: lat,
        longitude: lng,
        accuracy: 0, // Exact for manual entry
        timestamp: new Date().toISOString(),
        source: 'manual'
    };

    // Hide manual input
    hideManualLocationInput();

    showAlert('Manual location set successfully', 'success');
}

// Function to populate districts based on selected state
function populateDistricts() {
    const stateSelect = document.getElementById('manualState');
    const districtSelect = document.getElementById('manualDistrict');

    if (!stateSelect || !districtSelect) return;

    const selectedState = stateSelect.value;
    districtSelect.innerHTML = '<option value="">Select District</option>';
    districtSelect.disabled = true;

    if (!selectedState) return;

    // District data for Indian states
    const districts = {
        'Andhra Pradesh': ['Anantapur', 'Chittoor', 'East Godavari', 'Guntur', 'Kadapa', 'Krishna', 'Kurnool', 'Nellore', 'Prakasam', 'Srikakulam', 'Visakhapatnam', 'Vizianagaram', 'West Godavari'],
        'Arunachal Pradesh': ['Anjaw', 'Changlang', 'Dibang Valley', 'East Kameng', 'East Siang', 'Kamle', 'Kra Daadi', 'Kurung Kumey', 'Lepa Rada', 'Lohit', 'Longding', 'Lower Dibang Valley', 'Lower Siang', 'Lower Subansiri', 'Namsai', 'Pakke Kessang', 'Papum Pare', 'Shi Yomi', 'Siang', 'Tawang', 'Tirap', 'Upper Dibang Valley', 'Upper Siang', 'Upper Subansiri', 'West Kameng', 'West Siang'],
        'Assam': ['Baksa', 'Barpeta', 'Biswanath', 'Bongaigaon', 'Cachar', 'Charaideo', 'Chirang', 'Darrang', 'Dhemaji', 'Dhubri', 'Dibrugarh', 'Dima Hasao', 'Goalpara', 'Golaghat', 'Hailakandi', 'Hojai', 'Jorhat', 'Kamrup', 'Kamrup Metropolitan', 'Karbi Anglong', 'Karimganj', 'Kokrajhar', 'Lakhimpur', 'Majuli', 'Morigaon', 'Nagaon', 'Nalbari', 'Sivasagar', 'Sonitpur', 'South Salmara-Mankachar', 'Tinsukia', 'Udalguri', 'West Karbi Anglong'],
        'Bihar': ['Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur', 'Buxar', 'Darbhanga', 'East Champaran', 'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur', 'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura', 'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda', 'Nawada', 'Patna', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur', 'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali', 'West Champaran'],
        'Chhattisgarh': ['Balod', 'Baloda Bazar', 'Balrampur', 'Bastar', 'Bemetara', 'Bijapur', 'Bilaspur', 'Dantewada', 'Dhamtari', 'Durg', 'Gariaband', 'Gaurela-Pendra-Marwahi', 'Janjgir-Champa', 'Jashpur', 'Kabirdham', 'Kanker', 'Khairagarh-Chhuikhadan-Gandai', 'Kondagaon', 'Korba', 'Koriya', 'Mahasamund', 'Mungeli', 'Narayanpur', 'Raigarh', 'Raipur', 'Rajnandgaon', 'Sakti', 'Sarangarh-Bilaigarh', 'Sukma', 'Surajpur', 'Surguja'],
        'Goa': ['North Goa', 'South Goa'],
        'Gujarat': ['Ahmedabad', 'Amreli', 'Anand', 'Aravalli', 'Banaskantha', 'Bharuch', 'Bhavnagar', 'Botad', 'Chhota Udaipur', 'Dahod', 'Dang', 'Devbhoomi Dwarka', 'Gandhinagar', 'Gir Somnath', 'Jamnagar', 'Junagadh', 'Kheda', 'Kutch', 'Mahisagar', 'Mehsana', 'Morbi', 'Narmada', 'Navsari', 'Panchmahal', 'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar', 'Tapi', 'Vadodara', 'Valsad'],
        'Haryana': ['Ambala', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 'Gurugram', 'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh', 'Nuh', 'Palwal', 'Panchkula', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar'],
        'Himachal Pradesh': ['Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu', 'Lahaul and Spiti', 'Mandi', 'Shimla', 'Sirmaur', 'Solan', 'Una'],
        'Jharkhand': ['Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum', 'Garhwa', 'Giridih', 'Godda', 'Gumla', 'Hazaribagh', 'Jamtara', 'Khunti', 'Koderma', 'Latehar', 'Lohardaga', 'Pakur', 'Palamu', 'Ramgarh', 'Ranchi', 'Sahibganj', 'Seraikela Kharsawan', 'Simdega', 'West Singhbhum'],
        'Karnataka': ['Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban', 'Bidar', 'Chamarajanagar', 'Chikballapur', 'Chikkamagaluru', 'Chitradurga', 'Dakshina Kannada', 'Davangere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayapura', 'Yadgir'],
        'Kerala': ['Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad'],
        'Madhya Pradesh': ['Agar Malwa', 'Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani', 'Betul', 'Bhind', 'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas', 'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda', 'Hoshangabad', 'Indore', 'Jabalpur', 'Jhabua', 'Katni', 'Khandwa', 'Khargone', 'Mandla', 'Mandsaur', 'Morena', 'Narsinghpur', 'Neemuch', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam', 'Rewa', 'Sagar', 'Satna', 'Sehore', 'Seoni', 'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri', 'Sidhi', 'Singrauli', 'Tikamgarh', 'Ujjain', 'Umaria', 'Vidisha'],
        'Maharashtra': ['Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed', 'Bhandara', 'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Osmanabad', 'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'],
        'Manipur': ['Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West', 'Jiribam', 'Kakching', 'Kamjong', 'Kangpokpi', 'Noney', 'Pherzawl', 'Senapati', 'Tamenglong', 'Tengnoupal', 'Thoubal', 'Ukhrul'],
        'Meghalaya': ['East Garo Hills', 'East Jaintia Hills', 'East Khasi Hills', 'North Garo Hills', 'Ri Bhoi', 'South Garo Hills', 'South West Garo Hills', 'South West Khasi Hills', 'West Garo Hills', 'West Jaintia Hills', 'West Khasi Hills'],
        'Mizoram': ['Aizawl', 'Champhai', 'Hnahthial', 'Khawzawl', 'Kolasib', 'Lawngtlai', 'Lunglei', 'Mamit', 'Saiha', 'Saitual', 'Serchhip'],
        'Nagaland': ['Chümoukedima', 'Dimapur', 'Kiphire', 'Kohima', 'Longleng', 'Mokokchung', 'Mon', 'Niuland', 'Noklak', 'Peren', 'Phek', 'Shamator', 'Tseminyü', 'Tuensang', 'Wokha', 'Zunheboto'],
        'Odisha': ['Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghapur', 'Jajpur', 'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'],
        'Punjab': ['Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka', 'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana', 'Mansa', 'Moga', 'Muktsar', 'Nawanshahr', 'Pathankot', 'Patiala', 'Rupnagar', 'Sahibzada Ajit Singh Nagar', 'Sangrur', 'Sri Muktsar Sahib', 'Tarn Taran'],
        'Rajasthan': ['Ajmer', 'Alwar', 'Banswara', 'Baran', 'Barmer', 'Bharatpur', 'Bhilwara', 'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa', 'Dholpur', 'Dungarpur', 'Hanumangarh', 'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur', 'Karauli', 'Kota', 'Nagaur', 'Pali', 'Pratapgarh', 'Rajsamand', 'Sawai Madhopur', 'Sikar', 'Sirohi', 'Sri Ganganagar', 'Tonk', 'Udaipur'],
        'Sikkim': ['East Sikkim', 'North Sikkim', 'South Sikkim', 'West Sikkim'],
        'Tamil Nadu': ['Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 'Erode', 'Kallakurichi', 'Kancheepuram', 'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Mayiladurai', 'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Ranipet', 'Salem', 'Sivaganga', 'Tenkasi', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tirupathur', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar'],
        'Telangana': ['Adilabad', 'Bhadradri Kothagudem', 'Hanumakonda', 'Hyderabad', 'Jagtial', 'Jangaon', 'Jayashankar Bhupalpally', 'Jogulamba Gadwal', 'Kamareddy', 'Karimnagar', 'Khammam', 'Kumuram Bheem', 'Mahabubabad', 'Mahabubnagar', 'Mancherial', 'Medak', 'Medchal–Malkajgiri', 'Mulugu', 'Nagarkurnool', 'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal Rural', 'Warangal Urban', 'Yadadri Bhuvanagiri'],
        'Tripura': ['Dhalai', 'Gomati', 'Khowai', 'North Tripura', 'Sepahijala', 'South Tripura', 'Unakoti', 'West Tripura'],
        'Uttar Pradesh': ['Agra', 'Aligarh', 'Allahabad', 'Ambedkar Nagar', 'Amethi', 'Amroha', 'Auraiya', 'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Barabanki', 'Bareilly', 'Basti', 'Bhadohi', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli', 'Chitrakoot', 'Deoria', 'Etah', 'Etawah', 'Faizabad', 'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar', 'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur', 'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj', 'Kanpur Dehat', 'Kanpur Nagar', 'Kasganj', 'Kaushambi', 'Kheri', 'Kushinagar', 'Lakhimpur Kheri', 'Lalitpur', 'Lucknow', 'Maharajganj', 'Mahoba', 'Mainpuri', 'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar', 'Pilibhit', 'Pratapgarh', 'Prayagraj', 'Raebareli', 'Rampur', 'Saharanpur', 'Sambhal', 'Sant Kabir Nagar', 'Shahjahanpur', 'Shamli', 'Shravasti', 'Siddharthnagar', 'Sitapur', 'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi'],
        'Uttarakhand': ['Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar', 'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal', 'Udham Singh Nagar', 'Uttarkashi'],
        'West Bengal': ['Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur', 'Darjeeling', 'Hooghly', 'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong', 'Kolkata', 'Malda', 'Murshidabad', 'Nadia', 'North 24 Parganas', 'Paschim Bardhaman', 'Paschim Medinipur', 'Purba Bardhaman', 'Purba Medinipur', 'Purulia', 'South 24 Parganas', 'Uttar Dinajpur'],
        'Delhi': ['Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi', 'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi', 'West Delhi'],
        'Jammu and Kashmir': ['Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda', 'Ganderbal', 'Jammu', 'Kathua', 'Kishtwar', 'Kulgam', 'Kupwara', 'Poonch', 'Pulwama', 'Rajouri', 'Ramban', 'Reasi', 'Samba', 'Shopian', 'Srinagar', 'Udhampur'],
        'Ladakh': ['Kargil', 'Leh'],
        'Puducherry': ['Karaikal', 'Mahe', 'Puducherry', 'Yanam'],
        'Chandigarh': ['Chandigarh'],
        'Andaman and Nicobar Islands': ['Nicobar', 'North and Middle Andaman', 'South Andaman'],
        'Dadra and Nagar Haveli and Daman and Diu': ['Dadra and Nagar Haveli', 'Daman', 'Diu'],
        'Lakshadweep': ['Lakshadweep']
    };

    const stateDistricts = districts[selectedState];
    if (stateDistricts) {
        stateDistricts.forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            districtSelect.appendChild(option);
        });
        districtSelect.disabled = false;
    }
}

// Function to geocode address to coordinates
async function geocodeAddress() {
    const state = document.getElementById('manualState').value;
    const district = document.getElementById('manualDistrict').value;
    const taluk = document.getElementById('manualTaluk').value;
    const village = document.getElementById('manualVillage').value;
    const address = document.getElementById('manualAddress').value;

    if (!state) {
        showAlert('Please select a state', 'error');
        return;
    }

    // Build address string
    let fullAddress = '';
    if (village) fullAddress += village + ', ';
    if (taluk) fullAddress += taluk + ', ';
    if (district) fullAddress += district + ', ';
    fullAddress += state + ', India';
    if (address) fullAddress += ', ' + address;

    console.log('Geocoding address:', fullAddress);

    try {
        // Show loading
        const button = document.querySelector('.manual-location-input button');
        const originalText = button.textContent;
        button.textContent = '🔍 Searching...';
        button.disabled = true;

        // Try Nominatim geocoding
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1&countrycodes=IN`,
            {
                headers: {
                    'User-Agent': 'HearHelper-Emergency/1.0'
                }
            }
        );

        if (!response.ok) {
            throw new Error('Geocoding service unavailable');
        }

        const data = await response.json();
        console.log('Geocoding response:', data);

        if (data && data.length > 0) {
            const result = data[0];
            const lat = parseFloat(result.lat);
            const lng = parseFloat(result.lon);

            // Validate coordinates are in India
            const isInIndia = lat >= 8.4 && lat <= 37.6 && lng >= 68.7 && lng <= 97.25;
            if (!isInIndia) {
                showAlert('Location found but appears to be outside India. Please check your address details.', 'warning');
                return;
            }

            // Update display
            const locationDisplay = document.getElementById('locationDisplay');
            const addressText = document.getElementById('addressText');
            const coordinatesText = document.getElementById('coordinatesText');
            const accuracyText = document.getElementById('accuracyText');
            const locationSource = document.getElementById('locationSource');

            coordinatesText.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            accuracyText.textContent = 'Address lookup (approx)';
            locationSource.textContent = 'Manual Address';
            addressText.textContent = result.display_name || fullAddress;

            // Show display and store location
            locationDisplay.style.display = 'block';
            window.currentLocation = {
                latitude: lat,
                longitude: lng,
                accuracy: 1000, // Approximate accuracy for address lookup
                timestamp: new Date().toISOString(),
                source: 'address'
            };

            // Hide manual input
            hideManualLocationInput();

            showAlert('Location found successfully!', 'success');
        } else {
            // Try a simpler search without additional address details
            const simpleAddress = `${village || taluk || district || ''}, ${district || state}, India`;
            console.log('Trying simpler address:', simpleAddress);

            const simpleResponse = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(simpleAddress)}&limit=1&countrycodes=IN`,
                {
                    headers: {
                        'User-Agent': 'HearHelper-Emergency/1.0'
                    }
                }
            );

            if (simpleResponse.ok) {
                const simpleData = await simpleResponse.json();
                if (simpleData && simpleData.length > 0) {
                    const result = simpleData[0];
                    const lat = parseFloat(result.lat);
                    const lng = parseFloat(result.lon);

                    const isInIndia = lat >= 8.4 && lat <= 37.6 && lng >= 68.7 && lng <= 97.25;
                    if (isInIndia) {
                        // Update display with simplified result
                        const locationDisplay = document.getElementById('locationDisplay');
                        const addressText = document.getElementById('addressText');
                        const coordinatesText = document.getElementById('coordinatesText');
                        const accuracyText = document.getElementById('accuracyText');
                        const locationSource = document.getElementById('locationSource');

                        coordinatesText.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                        accuracyText.textContent = 'Address lookup (approx)';
                        locationSource.textContent = 'Manual Address';
                        addressText.textContent = result.display_name || simpleAddress;

                        locationDisplay.style.display = 'block';
                        window.currentLocation = {
                            latitude: lat,
                            longitude: lng,
                            accuracy: 2000, // More approximate for simplified search
                            timestamp: new Date().toISOString(),
                            source: 'address'
                        };

                        hideManualLocationInput();
                        showAlert('Location found with simplified search!', 'success');
                        return;
                    }
                }
            }

            showAlert('Could not find location for the provided address. Please try with different details or use GPS.', 'error');
        }

    } catch (error) {
        console.error('Geocoding error:', error);
        showAlert('Failed to find location. Please check your internet connection and try again.', 'error');
    } finally {
        // Reset button
        const button = document.querySelector('.manual-location-input button');
        if (button) {
            button.textContent = '🔍 Find Location';
            button.disabled = false;
        }
    }
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Emergency page loaded, initializing...');
    initializeEmergencyPage();
});