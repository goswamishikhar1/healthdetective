document.addEventListener('DOMContentLoaded', function() {
    const symptomSearch = document.getElementById('symptomSearch');
    const symptomsDropdown = document.getElementById('symptomsDropdown');
    const selectedSymptomsList = document.getElementById('selectedSymptoms');
    const predictionForm = document.getElementById('predictionForm');
    const resultsDiv = document.getElementById('results');
    const API_BASE_URL = 'https://healthdetective.site/api';
    const DISEASES_ENDPOINT = `${API_BASE_URL}/diseases`;
    const PREDICT_ENDPOINT = `${API_BASE_URL}/predict`;

    let allSymptoms = [];
    let selectedSymptoms = new Set();

    // Load all unique symptoms from the backend
    async function loadSymptoms() {
        try {
            const response = await fetch(DISEASES_ENDPOINT);
            if (!response.ok) {
                throw new Error('Failed to load symptoms');
            }
            const data = await response.json();
            allSymptoms = [...new Set(data.diseases.flatMap(disease => disease.symptoms))].sort();
            updateSymptomsDropdown();
        } catch (error) {
            console.error('Error loading symptoms:', error);
            showError('Failed to load symptoms. Please try again later.');
        }
    }

    // Function to update the symptoms dropdown based on search
    function updateSymptomsDropdown() {
        const searchTerm = symptomSearch.value.toLowerCase();
        const filteredSymptoms = allSymptoms.filter(symptom => 
            symptom.toLowerCase().includes(searchTerm)
        );

        symptomsDropdown.innerHTML = filteredSymptoms.map(symptom => `
            <li>
                <a class="dropdown-item ${selectedSymptoms.has(symptom) ? 'active' : ''}" href="#" data-symptom="${symptom}">
                    ${symptom}
                </a>
            </li>
        `).join('');

        // Add event listeners to dropdown items
        symptomsDropdown.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const symptom = this.dataset.symptom;
                if (this.classList.contains('active')) {
                    selectedSymptoms.delete(symptom);
                    this.classList.remove('active');
                } else {
                    selectedSymptoms.add(symptom);
                    this.classList.add('active');
                }
                updateSelectedSymptoms();
            });
        });
    }

    // Function to update the selected symptoms list
    function updateSelectedSymptoms() {
        selectedSymptomsList.innerHTML = Array.from(selectedSymptoms).map(symptom => `
            <span class="badge bg-primary me-2 mb-2">
                ${symptom}
                <button type="button" class="btn-close btn-close-white ms-2" aria-label="Remove" data-symptom="${symptom}"></button>
            </span>
        `).join('');

        // Add event listeners to remove buttons
        selectedSymptomsList.querySelectorAll('.btn-close').forEach(button => {
            button.addEventListener('click', function() {
                const symptom = this.dataset.symptom;
                selectedSymptoms.delete(symptom);
                updateSelectedSymptoms();
                updateSymptomsDropdown();
            });
        });
    }

    // Event listener for symptom search input
    symptomSearch.addEventListener('input', updateSymptomsDropdown);

    // Add event listener for Enter key in search bar
    symptomSearch.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const searchTerm = this.value.toLowerCase();
            const matchingSymptom = allSymptoms.find(symptom => 
                symptom.toLowerCase() === searchTerm
            );
            
            if (matchingSymptom) {
                if (!selectedSymptoms.has(matchingSymptom)) {
                    selectedSymptoms.add(matchingSymptom);
                    updateSelectedSymptoms();
                    updateSymptomsDropdown();
                }
                this.value = ''; // Clear the search input
            }
        }
    });

    // Event listener for form submission
    predictionForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const symptomsArray = Array.from(selectedSymptoms);
        
        if (symptomsArray.length === 0) {
            showError('Please select at least one symptom');
            return;
        }

        const description = document.getElementById('illnessDescription').value.trim();
        
        try {
            showLoading();
            const response = await fetch(PREDICT_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    symptoms: symptomsArray,
                    description: description
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get prediction');
            }

            const data = await response.json();
            if (!data.predictions || data.predictions.length === 0) {
                showError('No matching diseases found. Please try different symptoms.');
                return;
            }
            displayResults(data.predictions, symptomsArray);
        } catch (error) {
            showError('Failed to analyze symptoms. Please try again later.');
            console.error('Error:', error);
        } finally {
            hideLoading();
        }
    });

    // Function to display results
    function displayResults(predictions, selectedSymptomsArray) {
        if (!predictions || predictions.length === 0) {
            resultsDiv.innerHTML = `
                <div class="alert alert-info" role="alert">
                    No matching diseases found. Please try different symptoms.
                </div>
            `;
            return;
        }

        resultsDiv.innerHTML = predictions.map(prediction => {
            // Get remaining symptoms (symptoms not selected by user)
            const remainingSymptoms = prediction.symptoms.filter(symptom => 
                !selectedSymptomsArray.includes(symptom)
            );

            return `
                <div class="card mb-3">
                    <div class="card-header">
                        <h5 class="mb-0">${prediction.disease}</h5>
                        <small class="text-muted">Match: ${prediction.match_percentage.toFixed(1)}%</small>
                    </div>
                    <div class="card-body">
                        <p class="card-text">${prediction.description}</p>
                        
                        <div class="symptoms-section mb-3">
                            <h6><i class="fas fa-check-circle text-success me-2"></i>Your Symptoms:</h6>
                            <div class="selected-symptoms-list">
                                ${selectedSymptomsArray.map(symptom => `
                                    <span class="badge bg-success me-2 mb-2">
                                        ${symptom}
                                    </span>
                                `).join('')}
                            </div>
                        </div>

                        <div class="all-symptoms-section mb-3">
                            <h6><i class="fas fa-list text-primary me-2"></i>All Symptoms of ${prediction.disease}:</h6>
                            <div class="all-symptoms-list">
                                ${prediction.symptoms.map(symptom => `
                                    <span class="badge ${selectedSymptomsArray.includes(symptom) ? 'bg-success' : 'bg-primary'} me-2 mb-2">
                                        ${symptom}
                                    </span>
                                `).join('')}
                            </div>
                        </div>

                        <div class="remaining-symptoms-section mb-3">
                            <h6><i class="fas fa-question-circle text-warning me-2"></i>Other Symptoms to Check:</h6>
                            <div class="remaining-symptoms-list">
                                ${remainingSymptoms.map(symptom => `
                                    <span class="badge bg-warning text-dark me-2 mb-2">
                                        ${symptom}
                                    </span>
                                `).join('')}
                            </div>
                        </div>

                        <div class="precautions-section mb-4">
                            <h6 class="section-heading">
                                <i class="fas fa-shield-alt text-primary me-2"></i>Precautions
                            </h6>
                            <div class="precautions-list">
                                ${prediction.precautions.map(precaution => `
                                    <div class="precaution-item mb-2">
                                        <i class="fas fa-check-circle text-success me-2"></i>
                                        <span>${precaution}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="medications-section">
                            <h6 class="section-heading">
                                <i class="fas fa-pills text-info me-2"></i>Medications
                            </h6>
                            <div class="medications-list">
                                ${prediction.medications.map(medication => `
                                    <div class="medication-item mb-2">
                                        <i class="fas fa-capsules text-info me-2"></i>
                                        <span>${medication}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function showLoading() {
        document.getElementById('loadingSpinner').classList.remove('d-none');
        document.getElementById('errorMessage').classList.add('d-none');
        document.getElementById('results').innerHTML = '';
    }

    function hideLoading() {
        document.getElementById('loadingSpinner').classList.add('d-none');
    }

    function showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.classList.remove('d-none');
        document.getElementById('results').innerHTML = '';
    }

    // Initialize the application
    loadSymptoms();
}); 