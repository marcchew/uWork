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
  
  // Initialize PWA features
  initPWAFeatures();
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

/**
 * Initialize PWA-specific features
 */
function initPWAFeatures() {
  // Initialize offline form caching
  initOfflineFormCaching();
  
  // Initialize touch gestures for mobile
  initTouchGestures();
  
  // Initialize keyboard shortcuts
  initKeyboardShortcuts();
  
  // Initialize background sync detection
  initBackgroundSync();
}

/**
 * Cache form data offline for later submission
 */
function initOfflineFormCaching() {
  const forms = document.querySelectorAll('form[data-cache-offline]');
  
  forms.forEach(form => {
    const formId = form.id || `form_${Date.now()}`;
    const cacheKey = `offline_form_${formId}`;
    
    // Load cached data if available
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const data = JSON.parse(cachedData);
        Object.keys(data).forEach(name => {
          const input = form.querySelector(`[name="${name}"]`);
          if (input) {
            input.value = data[name];
          }
        });
        
        // Show cached data indicator
        showCachedDataNotification(form);
      } catch (error) {
        console.error('Error loading cached form data:', error);
      }
    }
    
    // Cache form data as user types
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('input', debounce(() => {
        cacheFormData(form, cacheKey);
      }, 1000));
    });
    
    // Handle form submission
    form.addEventListener('submit', async function(e) {
      if (!navigator.onLine) {
        e.preventDefault();
        
        // Cache for later submission
        cacheFormData(form, cacheKey);
        queueOfflineSubmission(form, cacheKey);
        
        showOfflineSubmissionNotification();
        return;
      }
      
      // Clear cache on successful online submission
      form.addEventListener('submit', () => {
        setTimeout(() => {
          localStorage.removeItem(cacheKey);
        }, 1000);
      });
    });
  });
}

/**
 * Cache form data to localStorage
 */
function cacheFormData(form, cacheKey) {
  const formData = new FormData(form);
  const data = {};
  
  for (let [name, value] of formData.entries()) {
    data[name] = value;
  }
  
  localStorage.setItem(cacheKey, JSON.stringify(data));
}

/**
 * Queue form for offline submission
 */
function queueOfflineSubmission(form, cacheKey) {
  const queueKey = 'offline_submission_queue';
  const queue = JSON.parse(localStorage.getItem(queueKey) || '[]');
  
  queue.push({
    formAction: form.action,
    formMethod: form.method || 'POST',
    cacheKey: cacheKey,
    timestamp: Date.now()
  });
  
  localStorage.setItem(queueKey, JSON.stringify(queue));
  
  // Register background sync if available
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then(registration => {
      registration.sync.register('background-sync');
    });
  }
}

/**
 * Initialize touch gestures for mobile PWA
 */
function initTouchGestures() {
  // Pull-to-refresh gesture
  let startY = 0;
  let isRefreshing = false;
  
  document.addEventListener('touchstart', (e) => {
    startY = e.touches[0].clientY;
  });
  
  document.addEventListener('touchmove', (e) => {
    if (isRefreshing) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    
    // If user is at top of page and pulling down
    if (window.scrollY === 0 && diff > 50) {
      e.preventDefault();
      
      if (diff > 100) {
        showRefreshIndicator();
      }
    }
  });
  
  document.addEventListener('touchend', (e) => {
    if (isRefreshing) return;
    
    const endY = e.changedTouches[0].clientY;
    const diff = endY - startY;
    
    if (window.scrollY === 0 && diff > 100) {
      isRefreshing = true;
      performRefresh();
    }
  });
  
  // Swipe gestures for navigation
  let startX = 0;
  
  document.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
  });
  
  document.addEventListener('touchend', (e) => {
    const endX = e.changedTouches[0].clientX;
    const diff = endX - startX;
    
    // Swipe right to go back (if supported)
    if (Math.abs(diff) > 100) {
      if (diff > 0 && window.history.length > 1) {
        // Swipe right - go back
        window.history.back();
      }
    }
  });
}

/**
 * Initialize keyboard shortcuts for productivity
 */
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Only handle shortcuts when not typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }
    
    // Ctrl/Cmd + K - Focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]');
      if (searchInput) {
        searchInput.focus();
      }
    }
    
    // Alt + H - Go to home
    if (e.altKey && e.key === 'h') {
      e.preventDefault();
      window.location.href = '/';
    }
    
    // Alt + D - Go to dashboard
    if (e.altKey && e.key === 'd') {
      e.preventDefault();
      window.location.href = '/dashboard';
    }
    
    // Alt + J - Go to jobs
    if (e.altKey && e.key === 'j') {
      e.preventDefault();
      window.location.href = '/jobs';
    }
    
    // Escape - Close modals/overlays
    if (e.key === 'Escape') {
      const activeModal = document.querySelector('.modal.show');
      if (activeModal) {
        bootstrap.Modal.getInstance(activeModal).hide();
      }
    }
  });
}

/**
 * Initialize background sync detection
 */
function initBackgroundSync() {
  // Process offline submission queue when coming back online
  window.addEventListener('online', () => {
    processOfflineSubmissionQueue();
  });
  
  // Check for pending submissions on page load
  if (navigator.onLine) {
    processOfflineSubmissionQueue();
  }
}

/**
 * Process queued offline form submissions
 */
async function processOfflineSubmissionQueue() {
  const queueKey = 'offline_submission_queue';
  const queue = JSON.parse(localStorage.getItem(queueKey) || '[]');
  
  if (queue.length === 0) return;
  
  for (let submission of queue) {
    try {
      const cachedData = localStorage.getItem(submission.cacheKey);
      if (!cachedData) continue;
      
      const formData = JSON.parse(cachedData);
      
      const response = await fetch(submission.formAction, {
        method: submission.formMethod,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        // Remove from queue and cache
        const updatedQueue = queue.filter(item => item.timestamp !== submission.timestamp);
        localStorage.setItem(queueKey, JSON.stringify(updatedQueue));
        localStorage.removeItem(submission.cacheKey);
        
        showSuccessNotification('Offline submission completed successfully!');
      }
    } catch (error) {
      console.error('Error processing offline submission:', error);
    }
  }
}

/**
 * Utility functions for PWA notifications
 */
function showCachedDataNotification(form) {
  const notification = document.createElement('div');
  notification.className = 'alert alert-info alert-dismissible fade show';
  notification.innerHTML = `
    <i class="bi bi-cloud-arrow-up me-2"></i>
    Draft data restored from offline cache.
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  form.parentElement.insertBefore(notification, form);
  
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

function showOfflineSubmissionNotification() {
  const notification = document.createElement('div');
  notification.className = 'alert alert-warning alert-dismissible fade show';
  notification.innerHTML = `
    <i class="bi bi-wifi-off me-2"></i>
    You're offline. Your submission has been saved and will be sent when you're back online.
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 8000);
}

function showRefreshIndicator() {
  const indicator = document.createElement('div');
  indicator.className = 'refresh-indicator';
  indicator.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Release to refresh';
  
  document.body.appendChild(indicator);
  
  setTimeout(() => {
    indicator.remove();
  }, 2000);
}

function performRefresh() {
  // Add refresh animation
  document.body.style.opacity = '0.8';
  
  setTimeout(() => {
    window.location.reload();
  }, 300);
}

function showSuccessNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'alert alert-success alert-dismissible fade show position-fixed';
  notification.style.cssText = 'top: 20px; right: 20px; z-index: 1060;';
  notification.innerHTML = `
    <i class="bi bi-check-circle me-2"></i>
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

/**
 * Debounce utility function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}