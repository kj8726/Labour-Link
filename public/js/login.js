// public/js/login.js
class LoginRegistrationFlow {
    constructor() {
        this.currentStep = 1;
        this.selectedUserType = null;
        this.collectedData = {};
        this.addressMap = null;
        this.userMarker = null;
        this.selectedLocation = null;
        this.mapInitialized = false; // track lazy init
        
        this.init();
    }

    init() {
        // Don't init map here — do it lazily when step 3 becomes visible
        this.setupEventListeners();
        this.initializeStepNavigation();
        this.restoreLoginErrorState();
        this.preSelectUserType();
    }

    // If the server re-rendered this page after a failed login attempt,
    // jump straight back to the login form on Step 2 and show the error there
    // instead of dropping the user back on the account-type selection screen.
    restoreLoginErrorState() {
        const body = document.body;
        const loginError = body.dataset.loginError;

        if (!loginError) return;

        const preselType = body.dataset.preselType;
        const loginEmail = body.dataset.loginEmail;

        if (preselType === 'customer' || preselType === 'labour') {
            const userTypeCard = document.querySelector(`.user-type-card[data-type="${preselType}"]`);
            if (userTypeCard) {
                this.handleUserTypeSelection(userTypeCard);
                userTypeCard.classList.add('selected');
            }
        }

        if (loginEmail) {
            const emailField = document.getElementById('loginEmail');
            if (emailField) emailField.value = loginEmail;
        }

        this.navigateToStep(2);

        const errorAlert = document.getElementById('loginErrorAlert');
        const errorText = document.getElementById('loginErrorText');
        if (errorAlert && errorText) {
            errorText.textContent = loginError;
            errorAlert.classList.remove('d-none');
        }

        const passwordField = document.getElementById('loginPassword');
        if (passwordField) passwordField.focus();
    }

    // Called the first time step 3 is shown
    initAddressMap() {
        if (this.mapInitialized) {
            // Map already exists — just fix tile rendering in case it was hidden
            this.addressMap.invalidateSize();
            return;
        }

        const defaultCenter = [20.5937, 78.9629];

        this.addressMap = L.map('addressMap', {
            preferCanvas: true   // faster rendering via canvas instead of SVG
        }).setView(defaultCenter, 5);

        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(this.addressMap);

        this.addressMap.on('click', (e) => {
            this.setSelectedLocation(e.latlng.lat, e.latlng.lng);
            this.updateStep3Validation();
        });

        this.mapInitialized = true;

        // Try to auto-detect location immediately when map opens
        this.tryAutoDetectLocation();
    }

    // Fast auto-detect using low-accuracy (network/IP) first
    tryAutoDetectLocation() {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Only auto-set if user hasn't manually picked a location yet
                if (!this.selectedLocation) {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    this.addressMap.setView([lat, lng], 13);
                    this.setSelectedLocation(lat, lng);
                    this.updateStep3Validation();
                }
            },
            () => { /* silently fail — user can pick manually */ },
            {
                enableHighAccuracy: false, // fast network/IP location instead of GPS
                timeout: 5000,
                maximumAge: 300000         // reuse a cached position up to 5 min old
            }
        );
    }

    setSelectedLocation(lat, lng) {
        this.selectedLocation = { lat, lng };

        if (this.userMarker) {
            this.addressMap.removeLayer(this.userMarker);
        }

        const customIcon = L.divIcon({
            className: 'custom-marker',
            html: '<i class="fas fa-map-marker-alt" style="color: #667eea; font-size: 30px;"></i>',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        });

        this.userMarker = L.marker([lat, lng], { icon: customIcon })
            .addTo(this.addressMap)
            .bindPopup('Your Selected Location')
            .openPopup();

        this.reverseGeocode(lat, lng);
    }

    async reverseGeocode(lat, lng) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const data = await response.json();

            if (data.address) {
                const city = data.address.city || data.address.town || data.address.village || '';
                const state = data.address.state || '';

                document.getElementById('city').value = city;
                document.getElementById('state').value = state;

                this.collectedData.city = city;
                this.collectedData.state = state;
                this.collectedData.lat = lat;
                this.collectedData.lng = lng;
            }
        } catch (error) {
            console.error('Error reverse geocoding:', error);
            this.showNotification('Error getting location details. Please try again.', 'error');
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.user-type-card').forEach(card => {
            card.addEventListener('click', () => this.handleUserTypeSelection(card));
        });

        // Debounced search — fires 400ms after user stops typing
        let searchDebounce;
        document.getElementById('locationSearch').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(searchDebounce);
                this.searchLocation();
            }
        });
        document.getElementById('locationSearch').addEventListener('input', () => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => {
                const val = document.getElementById('locationSearch').value;
                if (val.length > 3) this.searchLocation();
            }, 400);
        });

        document.getElementById('useCurrentLocation').addEventListener('click', () => {
            this.useCurrentLocation();
        });

        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegistrationStep2(e));
        document.querySelector('.final-register-btn').addEventListener('click', () => this.handleFinalRegistration());
    }

    handleUserTypeSelection(card) {
        document.querySelectorAll('.user-type-card').forEach(c => {
            c.classList.remove('selected');
        });

        card.classList.add('selected');
        this.selectedUserType = card.dataset.type;
        this.updateStep1Validation();

        const step2Description = document.getElementById('step2Description');
        if (this.selectedUserType === 'labour') {
            step2Description.textContent = 'Sign in or create your professional account';
            document.getElementById('professionalFields').style.display = 'block';
        } else {
            step2Description.textContent = 'Sign in or create your customer account';
            document.getElementById('professionalFields').style.display = 'none';
        }
    }

    initializeStepNavigation() {
        document.querySelectorAll('.btn-next').forEach(btn => {
            btn.addEventListener('click', () => {
                const nextStep = parseInt(btn.dataset.next);
                if (this.validateStep(this.currentStep)) {
                    this.navigateToStep(nextStep);
                }
            });
        });

        document.querySelectorAll('.btn-prev').forEach(btn => {
            btn.addEventListener('click', () => {
                const prevStep = parseInt(btn.dataset.prev);
                this.navigateToStep(prevStep);
            });
        });
    }

    validateStep(step) {
        switch (step) {
            case 1:
                if (!this.selectedUserType) {
                    this.showNotification('Please select an account type', 'error');
                    return false;
                }
                return true;

            case 2:
                return true;

            case 3:
                if (!this.selectedLocation) {
                    this.showNotification('Please set your location on the map', 'error');
                    return false;
                }
                return true;

            default:
                return true;
        }
    }

    navigateToStep(stepNumber) {
        document.querySelectorAll('.form-step').forEach(step => {
            step.classList.remove('active');
        });

        document.getElementById(`step${stepNumber}`).classList.add('active');

        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active');
            if (parseInt(step.dataset.step) <= stepNumber) {
                step.classList.add('active');
            }
        });

        this.currentStep = stepNumber;

        // Lazy-init the map only when step 3 first becomes visible
        if (stepNumber === 3) {
            // Small timeout ensures the element is visible before Leaflet measures it
            setTimeout(() => this.initAddressMap(), 50);
        }

        if (stepNumber === 4) {
            this.populateReviewSection();
        }
    }

    populateReviewSection() {
        document.getElementById('reviewName').textContent = this.collectedData.name || '-';
        document.getElementById('reviewEmail').textContent = this.collectedData.email || '-';
        document.getElementById('reviewPhone').textContent = this.collectedData.phone || '-';
        document.getElementById('reviewAge').textContent = this.collectedData.age || '-';
        document.getElementById('reviewUserType').textContent = this.selectedUserType === 'labour' ? 'Professional' : 'Customer';

        const professionalReview = document.getElementById('professionalReview');
        if (this.selectedUserType === 'labour') {
            professionalReview.style.display = 'block';
            document.getElementById('reviewProfession').textContent = this.collectedData.profession || '-';
            document.getElementById('reviewExperience').textContent = this.collectedData.experience || '-';
            document.getElementById('reviewWageHour').textContent = this.collectedData.wagePerHour || '-';
            document.getElementById('reviewWageDay').textContent = this.collectedData.wagePerDay || '-';
        } else {
            professionalReview.style.display = 'none';
        }

        document.getElementById('reviewCity').textContent = this.collectedData.city || '-';
        document.getElementById('reviewState').textContent = this.collectedData.state || '-';
    }

    async searchLocation() {
        const query = document.getElementById('locationSearch').value;
        if (!query) {
            this.showNotification('Please enter a location to search', 'error');
            return;
        }

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const data = await response.json();

            if (data && data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lon = parseFloat(result.lon);

                this.addressMap.setView([lat, lon], 12);
                this.setSelectedLocation(lat, lon);
                this.updateStep3Validation();
                this.showNotification('Location found and set!', 'success');
            } else {
                this.showNotification('Location not found. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Error searching location:', error);
            this.showNotification('Error searching location. Please try again.', 'error');
        }
    }

    useCurrentLocation() {
        if (!navigator.geolocation) {
            this.showNotification('Geolocation is not supported by your browser.', 'error');
            return;
        }

        this.showNotification('Getting your current location...', 'info');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                this.addressMap.setView([lat, lng], 13);
                this.setSelectedLocation(lat, lng);
                this.updateStep3Validation();
                this.showNotification('Current location set successfully!', 'success');
            },
            (error) => {
                let message = 'Unable to get your current location. ';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        message += 'Please enable location permissions in your browser.';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        message += 'Location information is unavailable.';
                        break;
                    case error.TIMEOUT:
                        message += 'Location request timed out.';
                        break;
                    default:
                        message += 'An unknown error occurred.';
                }
                this.showNotification(message, 'error');
            },
            {
                enableHighAccuracy: false, // fast — no GPS lock needed
                timeout: 8000,
                maximumAge: 300000
            }
        );
    }

    updateStep1Validation() {
        const nextButton = document.querySelector('#step1 .btn-next');
        nextButton.disabled = !this.selectedUserType;
    }

    updateStep3Validation() {
        const nextButton = document.querySelector('#step3 .btn-next');
        nextButton.disabled = !this.selectedLocation;
    }

    handleLogin(e) {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            e.preventDefault();
            this.showNotification('Please fill in all login fields', 'error');
            return;
        }
    }

    handleRegistrationStep2(e) {
        e.preventDefault();

        this.collectedData = {
            userType: this.selectedUserType,
            name: document.getElementById('registerName').value.trim(),
            email: document.getElementById('registerEmail').value.trim(),
            password: document.getElementById('registerPassword').value,
            phone: document.getElementById('registerPhone').value.trim(),
            age: document.getElementById('registerAge').value
        };

        if (!this.collectedData.name || !this.collectedData.email || !this.collectedData.password ||
            !this.collectedData.phone || !this.collectedData.age) {
            this.showNotification('Please fill all required fields', 'error');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(this.collectedData.email)) {
            this.showNotification('Please enter a valid email address', 'error');
            return;
        }

        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(this.collectedData.phone.replace(/\D/g, ''))) {
            this.showNotification('Please enter a valid 10-digit phone number', 'error');
            return;
        }

        if (this.collectedData.age < 18 || this.collectedData.age > 100) {
            this.showNotification('Age must be between 18 and 100', 'error');
            return;
        }

        if (this.collectedData.password.length < 6) {
            this.showNotification('Password must be at least 6 characters long', 'error');
            return;
        }

        if (this.selectedUserType === 'labour') {
            this.collectedData.profession = document.getElementById('profession').value;
            this.collectedData.experience = document.getElementById('experience').value;
            this.collectedData.wagePerHour = document.getElementById('wagePerHour').value || '0';
            this.collectedData.wagePerDay = document.getElementById('wagePerDay').value || '0';

            if (!this.collectedData.profession || !this.collectedData.experience) {
                this.showNotification('Please fill all professional information', 'error');
                return;
            }
        }

        this.navigateToStep(3);
    }

    handleFinalRegistration() {
        if (!this.selectedLocation) {
            this.showNotification('Please set your location on the map', 'error');
            return;
        }

        document.getElementById('finalUserType').value = this.collectedData.userType;
        document.getElementById('finalName').value = this.collectedData.name;
        document.getElementById('finalEmail').value = this.collectedData.email;
        document.getElementById('finalPassword').value = this.collectedData.password;
        document.getElementById('finalPhone').value = this.collectedData.phone;
        document.getElementById('finalAge').value = this.collectedData.age;
        document.getElementById('finalCity').value = this.collectedData.city || '';
        document.getElementById('finalState').value = this.collectedData.state || '';
        document.getElementById('finalLat').value = this.collectedData.lat || '';
        document.getElementById('finalLng').value = this.collectedData.lng || '';

        if (this.collectedData.userType === 'labour') {
            document.getElementById('finalProfession').value = this.collectedData.profession || '';
            document.getElementById('finalExperience').value = this.collectedData.experience || '';
            document.getElementById('finalWagePerHour').value = this.collectedData.wagePerHour || '';
            document.getElementById('finalWagePerDay').value = this.collectedData.wagePerDay || '';
        }

        this.showLoadingSpinner(true);
        document.getElementById('finalRegisterForm').submit();
    }

    preSelectUserType() {
        const urlParams = new URLSearchParams(window.location.search);
        const registerAs = urlParams.get('register');

        if (registerAs) {
            const userTypeCard = document.querySelector(`.user-type-card[data-type="${registerAs}"]`);
            if (userTypeCard) {
                userTypeCard.click();
            }
        }
    }

    showNotification(message, type) {
        document.querySelectorAll('.custom-notification').forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `custom-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    showLoadingSpinner(show) {
        const loadingSpinner = document.getElementById('loadingSpinner');
        loadingSpinner.style.display = show ? 'flex' : 'none';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    window.loginFlow = new LoginRegistrationFlow();
});