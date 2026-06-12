// --- 1. Compatibility Config ---
const compatibilityEngine = {
    "O-":  ["O-"], "O+":  ["O-", "O+"],
    "A-":  ["O-", "A-"], "A+":  ["O-", "O+", "A-", "A+"],
    "B-":  ["O-", "B-"], "B+":  ["O-", "O+", "B-", "B+"],
    "AB-": ["O-", "A-", "B-", "AB-"],
    "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]
};

// --- 2. Live Mock Repositories ---
let hospitalLocation = { lat: 28.6139, lon: 77.2090 }; // Default base coords (Delhi, India)
let mockDonorsDB = [];
const DONOR_STORAGE_KEY = 'blood-donor-registry';
let currentMatchedDonors = [];

const mockDoctors = [
    { name: "Dr. Aris Thorne", spec: "Lead Hematologist", phone: "+919876543210" },
    { name: "Dr. Elena Rostova", spec: "Emergency Medicine Care", phone: "+918765432109" },
    { name: "Dr. Marcus Vance", spec: "Blood Bank Supervisor", phone: "+917654321098" }
];

// --- 3. DOM Cache ---
const radiusSlider = document.getElementById('radius');
const radiusValueDisplay = document.getElementById('radius-value');
const searchBtn = document.getElementById('search-btn');
const bloodTypeSelect = document.getElementById('blood-type');
const donorList = document.getElementById('donor-list');
const doctorListContainer = document.getElementById('doctor-list');
const totalFoundDisplay = document.getElementById('total-found');
const statusMsg = document.getElementById('status-msg');
const broadcastBtn = document.getElementById('broadcast-btn');
const donorRegisterBtn = document.getElementById('donor-register-btn');
const donorDistanceSlider = document.getElementById('donor-distance');
const donorDistanceValueDisplay = document.getElementById('donor-distance-value');
const donorStatusMsg = document.getElementById('donor-status-msg');
const certificateCard = document.getElementById('certificate-card');
const feedbackDonorSelect = document.getElementById('feedback-donor');
const feedbackRatingSelect = document.getElementById('feedback-rating');
const feedbackCommentInput = document.getElementById('feedback-comment');
const feedbackSubmitBtn = document.getElementById('feedback-submit-btn');
const feedbackStatusMsg = document.getElementById('feedback-status-msg');
const FORM_STATE_KEY = 'blood-donor-form-state';

// Registration inputs
const inputName = document.getElementById('patient-name');
const inputPhone = document.getElementById('contact-phone');
const donorNameInput = document.getElementById('donor-name');
const donorPhoneInput = document.getElementById('donor-phone');
const donorBloodTypeSelect = document.getElementById('donor-blood-type');

// --- 4. Core Logic Procedures ---

radiusSlider.addEventListener('input', (e) => radiusValueDisplay.innerText = e.target.value);
donorDistanceSlider.addEventListener('input', (e) => donorDistanceValueDisplay.innerText = e.target.value);

function normalizePhoneNumber(phone) {
    return phone.replace(/\D/g, '');
}

function formatIndianPhoneNumber(phone) {
    const digits = normalizePhoneNumber(phone);

    if (digits.length === 12 && digits.startsWith('91')) {
        return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
    }

    if (digits.length === 10) {
        return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }

    return phone;
}

function isValidPhoneNumber(phone) {
    const digits = normalizePhoneNumber(phone);
    if (digits.length === 10) {
        return /^[6-9]\d{9}$/.test(digits);
    }

    if (digits.length === 12 && digits.startsWith('91')) {
        return /^[6-9]\d{9}$/.test(digits.slice(2));
    }

    return false;
}

function getTelHref(phone) {
    const digits = normalizePhoneNumber(phone);

    if (digits.length === 12 && digits.startsWith('91')) {
        return `tel:+${digits}`;
    }

    if (digits.length === 10) {
        return `tel:+91${digits}`;
    }

    return `tel:${phone.startsWith('+') ? phone : `+${digits}`}`;
}

function getWhatsAppHref(phone, message) {
    const digits = normalizePhoneNumber(phone);
    const countryFormatted = digits.length === 10 ? `91${digits}` : digits;

    return `https://wa.me/${countryFormatted}?text=${encodeURIComponent(message)}`;
}

function createIndianMobileNumber() {
    const firstDigit = Math.floor(6 + Math.random() * 4);
    const remainingDigits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
    return `+91${firstDigit}${remainingDigits}`;
}

function readStoredDonors() {
    try {
        const storedValue = localStorage.getItem(DONOR_STORAGE_KEY);
        const parsedValue = storedValue ? JSON.parse(storedValue) : [];

        if (!Array.isArray(parsedValue)) {
            return [];
        }

        return parsedValue
            .filter((donor) => donor && donor.name && donor.phone && donor.bloodType)
            .map((donor) => ({
                ...donor,
                creditPoints: typeof donor.creditPoints === 'number' ? donor.creditPoints : 0,
                donationCount: typeof donor.donationCount === 'number' ? donor.donationCount : 0,
                feedbackCount: typeof donor.feedbackCount === 'number' ? donor.feedbackCount : 0,
                lastFeedback: donor.lastFeedback || null,
                lastDonationDate: donor.lastDonationDate || null
            }));
    } catch {
        return [];
    }
}

function saveDonorsToStorage() {
    localStorage.setItem(DONOR_STORAGE_KEY, JSON.stringify(mockDonorsDB));
}

function saveFormState() {
    const formState = {
        patientName: inputName?.value || '',
        patientPhone: inputPhone?.value || '',
        bloodType: bloodTypeSelect?.value || 'O-',
        radius: radiusSlider?.value || '10',
        donorName: donorNameInput?.value || '',
        donorPhone: donorPhoneInput?.value || '',
        donorBloodType: donorBloodTypeSelect?.value || 'O-',
        donorDistance: donorDistanceSlider?.value || '5'
    };

    localStorage.setItem(FORM_STATE_KEY, JSON.stringify(formState));
}

function restoreFormState() {
    try {
        const savedState = localStorage.getItem(FORM_STATE_KEY);

        if (!savedState) {
            radiusValueDisplay.innerText = radiusSlider.value;
            donorDistanceValueDisplay.innerText = donorDistanceSlider.value;
            return;
        }

        const parsedState = JSON.parse(savedState);

        if (inputName && typeof parsedState.patientName === 'string') inputName.value = parsedState.patientName;
        if (inputPhone && typeof parsedState.patientPhone === 'string') inputPhone.value = parsedState.patientPhone;
        if (bloodTypeSelect && typeof parsedState.bloodType === 'string') bloodTypeSelect.value = parsedState.bloodType;
        if (radiusSlider && typeof parsedState.radius === 'string') radiusSlider.value = parsedState.radius;
        if (donorNameInput && typeof parsedState.donorName === 'string') donorNameInput.value = parsedState.donorName;
        if (donorPhoneInput && typeof parsedState.donorPhone === 'string') donorPhoneInput.value = parsedState.donorPhone;
        if (donorBloodTypeSelect && typeof parsedState.donorBloodType === 'string') donorBloodTypeSelect.value = parsedState.donorBloodType;
        if (donorDistanceSlider && typeof parsedState.donorDistance === 'string') donorDistanceSlider.value = parsedState.donorDistance;

        radiusValueDisplay.innerText = radiusSlider.value;
        donorDistanceValueDisplay.innerText = donorDistanceSlider.value;
    } catch {
        radiusValueDisplay.innerText = radiusSlider.value;
        donorDistanceValueDisplay.innerText = donorDistanceSlider.value;
    }
}

[
    inputName,
    inputPhone,
    bloodTypeSelect,
    radiusSlider,
    donorNameInput,
    donorPhoneInput,
    donorBloodTypeSelect,
    donorDistanceSlider
].forEach((field) => {
    if (!field) {
        return;
    }

    field.addEventListener('input', saveFormState);
    field.addEventListener('change', saveFormState);
});

function getDonorCredits(donor) {
    return typeof donor.creditPoints === 'number' ? donor.creditPoints : 0;
}

function getDonorDonationCount(donor) {
    return typeof donor.donationCount === 'number' ? donor.donationCount : 0;
}

function getDonorFeedbackCount(donor) {
    return typeof donor.feedbackCount === 'number' ? donor.feedbackCount : 0;
}

function buildCertificate(donor) {
    const donationCount = getDonorDonationCount(donor);
    const creditPoints = getDonorCredits(donor);
    const feedbackCount = getDonorFeedbackCount(donor);
    const certificateId = `CERT-${donor.id}`;
    const dateLabel = new Date().toLocaleDateString('en-IN');

    return `
        <div class="certificate">
            <div class="certificate-badge">Donation Certificate</div>
            <h3>${donor.name}</h3>
            <p>Blood Group: <strong>${donor.bloodType}</strong></p>
            <p>Certificate ID: <strong>${certificateId}</strong></p>
            <p>Feedback Count: <strong>${feedbackCount}</strong></p>
            <p>Donation Count: <strong>${donationCount}</strong></p>
            <p>Credit Points: <strong>${creditPoints}</strong></p>
            <p>Issued On: <strong>${dateLabel}</strong></p>
        </div>
    `;
}

function showCertificate(donor) {
    certificateCard.innerHTML = buildCertificate(donor);
}

function refreshFeedbackDonorOptions() {
    if (!feedbackDonorSelect) {
        return;
    }

    const selectedValue = feedbackDonorSelect.value;
    feedbackDonorSelect.innerHTML = '<option value="">Select a donor</option>' + mockDonorsDB.map((donor) => {
        return `<option value="${donor.id}">${donor.name} - ${donor.bloodType}</option>`;
    }).join('');

    if (mockDonorsDB.some((donor) => donor.id === selectedValue)) {
        feedbackDonorSelect.value = selectedValue;
    }
}

function awardFeedbackCredit(donorId, rating, comment) {
    const donorIndex = mockDonorsDB.findIndex((donor) => donor.id === donorId);

    if (donorIndex === -1) {
        return;
    }

    const donor = mockDonorsDB[donorIndex];
    donor.feedbackCount = getDonorFeedbackCount(donor) + 1;
    donor.donationCount = getDonorDonationCount(donor) + 1;
    donor.creditPoints = getDonorCredits(donor) + (rating * 10);
    donor.lastFeedback = {
        rating,
        comment,
        date: new Date().toISOString()
    };

    mockDonorsDB[donorIndex] = donor;
    saveDonorsToStorage();
    showCertificate(donor);
    donorStatusMsg.innerText = `${donor.name} received a certificate and ${rating * 10} credit points from patient feedback.`;
    refreshFeedbackDonorOptions();
}

function buildUrgentBloodAlarmMessage(patientName, targetBlood, patientPhone) {
    return `Urgent Blood Alarm: ${patientName} needs ${targetBlood} blood immediately. Please contact ${patientPhone} as soon as possible.`;
}

function sendEmergencyAlarm(autoTriggered = false) {
    if (currentMatchedDonors.length === 0) {
        if (!autoTriggered) {
            alert('No matching donors are available for emergency broadcast.');
        }
        return;
    }

    const patientName = inputName.value.trim();
    const patientPhone = inputPhone.value.trim();
    const targetBlood = bloodTypeSelect.value;
    const alarmMessage = buildUrgentBloodAlarmMessage(patientName, targetBlood, patientPhone);

    currentMatchedDonors.slice(0, 5).forEach((donor) => {
        const alarmUrl = getWhatsAppHref(donor.phone, alarmMessage);
        window.open(alarmUrl, '_blank', 'noopener,noreferrer');
    });

    statusMsg.innerText = `Urgent blood alarm sent to ${Math.min(currentMatchedDonors.length, 5)} donor mobile numbers.`;
}

function createDonorLocation(distanceKm) {
    const angle = Math.random() * Math.PI * 2;
    const latOffset = (distanceKm / 111) * Math.cos(angle);
    const lonFactor = Math.cos(hospitalLocation.lat * Math.PI / 180) || 1;
    const lonOffset = (distanceKm / (111 * lonFactor)) * Math.sin(angle);

    return {
        lat: hospitalLocation.lat + latOffset,
        lon: hospitalLocation.lon + lonOffset
    };
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}

function initDataPool() {
    // Load only donor records that were registered in the form.
    mockDonorsDB = readStoredDonors();
    refreshFeedbackDonorOptions();

    // Render local doctor panel database
    doctorListContainer.innerHTML = mockDoctors.map(doc => `
        <div class="doc-card">
            <div class="doc-info">
                <h4>${doc.name}</h4>
                <p>${doc.spec}</p>
            </div>
            <div class="doc-actions">
                <a href="${getTelHref(doc.phone)}" class="btn-comm btn-call">Call Specialist</a>
            </div>
        </div>
    `).join('');

    if (mockDonorsDB.length === 0) {
        donorList.innerHTML = '<li class="empty-state">No donor registrations saved yet. Register a donor to begin searching.</li>';
        totalFoundDisplay.innerText = '0';
        broadcastBtn.disabled = true;
        statusMsg.innerText = 'No saved donor records found yet.';
        currentMatchedDonors = [];
        certificateCard.innerHTML = '<p class="certificate-empty">No donation certificate yet. Submit patient feedback to generate one.</p>';
    }
}

donorRegisterBtn.addEventListener('click', () => {
    const donorName = donorNameInput.value.trim();
    const donorPhone = donorPhoneInput.value.trim();
    const donorBloodType = donorBloodTypeSelect.value;
    const donorDistance = parseFloat(donorDistanceSlider.value);

    if (!donorName || !donorPhone) {
        donorStatusMsg.innerText = 'Enter the donor name and mobile number first.';
        return;
    }

    if (!isValidPhoneNumber(donorPhone)) {
        donorStatusMsg.innerText = 'Enter a valid mobile number with 8 to 15 digits.';
        return;
    }

    const donorLocation = createDonorLocation(donorDistance);

    mockDonorsDB.unshift({
        id: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
        name: donorName,
        phone: getTelHref(donorPhone).replace('tel:', ''),
        bloodType: donorBloodType,
        lat: donorLocation.lat,
        lon: donorLocation.lon,
        creditPoints: 0,
        donationCount: 0,
        feedbackCount: 0,
        lastDonationDate: null
    });

    saveDonorsToStorage();

    donorStatusMsg.innerText = `${donorName} was registered successfully as a ${donorBloodType} donor.`;
    donorNameInput.value = '';
    donorPhoneInput.value = '';
    donorBloodTypeSelect.value = 'O-';
    donorDistanceSlider.value = '5';
    donorDistanceValueDisplay.innerText = '5';
    refreshFeedbackDonorOptions();
    saveFormState();
});

broadcastBtn.addEventListener('click', sendEmergencyAlarm);

if (feedbackSubmitBtn) {
    feedbackSubmitBtn.addEventListener('click', () => {
        const donorId = feedbackDonorSelect.value;
        const rating = parseInt(feedbackRatingSelect.value, 10);
        const comment = feedbackCommentInput.value.trim();

        if (!donorId) {
            feedbackStatusMsg.innerText = 'Select a donor to submit patient feedback.';
            return;
        }

        if (!comment) {
            feedbackStatusMsg.innerText = 'Enter patient feedback before submitting.';
            return;
        }

        awardFeedbackCredit(donorId, rating, comment);
        feedbackStatusMsg.innerText = 'Patient feedback saved and certificate generated.';
        feedbackCommentInput.value = '';
        feedbackRatingSelect.value = '5';
    });
}

// Perform Registration & Query Processing Pipeline
searchBtn.addEventListener('click', () => {
    const nameValue = inputName.value.trim();
    const phoneValue = inputPhone.value.trim();
    
    if(!nameValue || !phoneValue) {
        alert("Please complete Patient Registration details before seeking matching assets.");
        return;
    }

    if (!isValidPhoneNumber(phoneValue)) {
        alert('Please enter a valid Indian mobile number with 10 digits or +91 format.');
        return;
    }

    const targetBlood = bloodTypeSelect.value;
    const maxRadius = parseFloat(radiusSlider.value);
    const validMatches = compatibilityEngine[targetBlood];

    let matchCount = 0;
    let listHTML = '';
    currentMatchedDonors = [];

    mockDonorsDB.forEach(donor => {
        if(validMatches.includes(donor.bloodType)) {
            const distance = calculateDistance(hospitalLocation.lat, hospitalLocation.lon, donor.lat, donor.lon);
            
            if(distance <= maxRadius) {
                matchCount++;
                currentMatchedDonors.push(donor);
                
                // Construct a text string for a tailored WhatsApp emergency dispatch request
                const textMessage = `Emergency: This is ${nameValue}. I am in urgent need of blood type ${targetBlood}. Please contact me back immediately at ${phoneValue}.`;
                const whatsappUrl = getWhatsAppHref(donor.phone, textMessage);

                listHTML += `
                    <li class="donor-card">
                        <div class="donor-info">
                            <strong>${donor.bloodType}</strong>
                            <span>Name: ${donor.name} (${donor.id})</span>
                            <span style="color: var(--text-muted)">📱 ${formatIndianPhoneNumber(donor.phone)}</span>
                            <span style="color: var(--text-muted)">📍 ${distance.toFixed(1)} km out</span>
                            <span style="color: var(--text-muted)">⭐ ${getDonorCredits(donor)} credits</span>
                        </div>
                        <div class="donor-actions">
                            <a href="${getTelHref(donor.phone)}" class="btn-comm btn-call">Call</a>
                            <a href="${whatsappUrl}" target="_blank" class="btn-comm btn-chat">WhatsApp</a>
                        </div>
                    </li>
                `;
            }
        }
    });

    totalFoundDisplay.innerText = matchCount;
    statusMsg.innerText = `Registration saved successfully for ${nameValue}. Displaying matching profiles.`;

    if(matchCount > 0) {
        donorList.innerHTML = listHTML;
        broadcastBtn.disabled = false;
        sendEmergencyAlarm(true);
    } else {
        donorList.innerHTML = `<li class="empty-state">No matching profiles within ${maxRadius}km. Try broadening your perimeter.</li>`;
        broadcastBtn.disabled = true;
    }

    saveFormState();
});

window.onload = () => {
    restoreFormState();

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                hospitalLocation.lat = pos.coords.latitude;
                hospitalLocation.lon = pos.coords.longitude;
                initDataPool();
            },
            () => { initDataPool(); } // Fallback execution profile using base parameters
        );
    } else {
        initDataPool();
    }
};