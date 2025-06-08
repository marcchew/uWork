document.addEventListener('DOMContentLoaded', function() {
  // Initialize priority sliders
  initPrioritySliders();
  
  // Initialize match score animations
  initMatchScores();
  
  // Initialize job application form
  initJobApplicationForm();
  
  // Initialize save job/candidate buttons
  initSaveButtons();
  
  // Initialize offer response buttons
  initOfferResponseButtons();
  
  // Initialize career advice form
  initCareerAdviceForm();
});

/**
 * Initialize priority sliders with visual feedback
 */
function initPrioritySliders() {
  const sliders = document.querySelectorAll('.priority-slider .form-range');
  
  sliders.forEach(slider => {
    const valueDisplay = slider.parentElement.querySelector('.value-display');
    
    // Set initial value
    if (valueDisplay) {
      valueDisplay.textContent = slider.value;
    }
    
    // Update value on change
    slider.addEventListener('input', function() {
      if (valueDisplay) {
        valueDisplay.textContent = this.value;
      }
    });
  });
}

/**
 * Initialize match score progress bars with animation
 */
function initMatchScores() {
  const matchScores = document.querySelectorAll('.match-score');
  
  matchScores.forEach(scoreElement => {
    const scoreValue = parseInt(scoreElement.dataset.score || 0);
    const progressBar = scoreElement.querySelector('.match-score-bar');
    
    if (progressBar) {
      // Delay to allow for smooth animation
      setTimeout(() => {
        progressBar.style.width = `${scoreValue}%`;
      }, 300);
    }
    
    // Add appropriate class based on score
    if (scoreValue >= 80) {
      scoreElement.classList.add('match-score-high');
    } else if (scoreValue >= 50) {
      scoreElement.classList.add('match-score-medium');
    } else {
      scoreElement.classList.add('match-score-low');
    }
  });
}

/**
 * Initialize job application form with validation and submission
 */
function initJobApplicationForm() {
  const applicationForm = document.getElementById('job-application-form');
  
  if (applicationForm) {
    applicationForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const jobId = this.dataset.jobId;
      const coverLetter = document.getElementById('cover-letter').value;
      
      try {
        const response = await fetch(`/api/apply-job/${jobId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ coverLetter })
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Show success message
          const messageContainer = document.getElementById('application-message');
          messageContainer.innerHTML = `
            <div class="alert alert-success" role="alert">
              <i class="bi bi-check-circle-fill me-2"></i>
              Application submitted successfully!
            </div>
          `;
          
          // Disable form
          document.getElementById('cover-letter').disabled = true;
          document.querySelector('button[type="submit"]').disabled = true;
          
          // Redirect after delay
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 2000);
        } else {
          // Show error message
          const messageContainer = document.getElementById('application-message');
          messageContainer.innerHTML = `
            <div class="alert alert-danger" role="alert">
              <i class="bi bi-exclamation-circle-fill me-2"></i>
              ${data.message}
            </div>
          `;
        }
      } catch (error) {
        console.error('Error submitting application:', error);
        
        // Show error message
        const messageContainer = document.getElementById('application-message');
        messageContainer.innerHTML = `
          <div class="alert alert-danger" role="alert">
            <i class="bi bi-exclamation-circle-fill me-2"></i>
            An error occurred. Please try again.
          </div>
        `;
      }
    });
  }
}

/**
 * Initialize save job/candidate buttons
 */
function initSaveButtons() {
  const saveButtons = document.querySelectorAll('.save-button');
  
  saveButtons.forEach(button => {
    button.addEventListener('click', async function() {
      const id = this.dataset.id;
      const type = this.dataset.type; // 'job' or 'candidate'
      const icon = this.querySelector('i');
      
      try {
        const response = await fetch(`/api/save-${type}/${id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Update button state
          if (data.saved) {
            icon.classList.remove('bi-bookmark');
            icon.classList.add('bi-bookmark-fill');
            this.setAttribute('title', `Unsave ${type}`);
          } else {
            icon.classList.remove('bi-bookmark-fill');
            icon.classList.add('bi-bookmark');
            this.setAttribute('title', `Save ${type}`);
          }
        } else {
          console.error('Error saving:', data.message);
        }
      } catch (error) {
        console.error(`Error saving ${type}:`, error);
      }
    });
  });
}

/**
 * Initialize offer response buttons (accept/decline)
 */
function initOfferResponseButtons() {
  const responseButtons = document.querySelectorAll('.offer-response-button');
  
  responseButtons.forEach(button => {
    button.addEventListener('click', async function() {
      const offerId = this.dataset.offerId;
      const response = this.dataset.response; // 'accepted' or 'declined'
      
      if (confirm(`Are you sure you want to ${response} this offer?`)) {
        try {
          const apiResponse = await fetch(`/api/respond-offer/${offerId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ response })
          });
          
          const data = await apiResponse.json();
          
          if (data.success) {
            // Show success message and refresh page
            alert(`Offer ${response} successfully`);
            window.location.reload();
          } else {
            alert(data.message);
          }
        } catch (error) {
          console.error('Error responding to offer:', error);
          alert('An error occurred. Please try again.');
        }
      }
    });
  });
}

/**
 * Initialize career advice form with AI-powered responses
 */
function initCareerAdviceForm() {
  const adviceForm = document.getElementById('career-advice-form');
  
  if (adviceForm) {
    adviceForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const category = document.getElementById('advice-category').value;
      const question = document.getElementById('advice-question').value;
      const resultContainer = document.getElementById('advice-result');
      const submitButton = document.querySelector('button[type="submit"]');
      
      // Validate
      if (!category || !question) {
        resultContainer.innerHTML = `
          <div class="alert alert-danger">
            Please select a category and enter your question.
          </div>
        `;
        return;
      }
      
      // Show loading state
      submitButton.disabled = true;
      resultContainer.innerHTML = `
        <div class="card">
          <div class="card-body text-center">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Generating personalized advice...</p>
          </div>
        </div>
      `;
      
      try {
        const response = await fetch('/api/get-advice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ category, question })
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Format advice - convert markdown-like content to HTML
          let formattedAdvice = data.advice
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
          
          resultContainer.innerHTML = `
            <div class="card animate-fadeIn">
              <div class="card-body">
                <h3 class="card-title">Your Personalized Advice</h3>
                <div class="advice-content">
                  <p>${formattedAdvice}</p>
                </div>
              </div>
            </div>
          `;
        } else {
          resultContainer.innerHTML = `
            <div class="alert alert-danger">
              ${data.message || 'Error generating advice. Please try again.'}
            </div>
          `;
        }
      } catch (error) {
        console.error('Error getting advice:', error);
        resultContainer.innerHTML = `
          <div class="alert alert-danger">
            An error occurred. Please try again.
          </div>
        `;
      } finally {
        submitButton.disabled = false;
      }
    });
  }
}