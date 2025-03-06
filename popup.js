document.addEventListener('DOMContentLoaded', function() {
  const apiKeyInput = document.getElementById('apiKey');
  const resumeFileInput = document.getElementById('resumeFile');
  const saveButton = document.getElementById('saveSettings');
  const statusMessage = document.getElementById('statusMessage');
  const resumeStatus = document.getElementById('resumeStatus');
  
  // Load saved API key
  chrome.storage.local.get(['openaiApiKey'], function(result) {
    if (result.openaiApiKey) {
      apiKeyInput.value = result.openaiApiKey;
    }
  });
  
  // Check if resume is saved
  chrome.storage.local.get(['resume'], function(result) {
    if (result.resume) {
      resumeStatus.textContent = `Resume loaded: ${result.resume.fileName}`;
    }
  });
  
  // Handle resume file upload
  resumeFileInput.addEventListener('change', function(event) {
    const file = event.target.files[0];
    
    if (!file) return;
    
    if (file.type !== 'application/pdf' && 
        file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      resumeStatus.textContent = 'Error: Please upload a PDF or DOCX file';
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
      const resumeData = {
        fileName: file.name,
        fileType: file.type,
        data: e.target.result,
        dateUploaded: new Date().toISOString()
      };
      
      // Store resume data locally
      chrome.storage.local.set({ resume: resumeData }, function() {
        resumeStatus.textContent = `File loaded: ${file.name}`;
      });
    };
    
    reader.readAsDataURL(file);
  });
  
  // Save settings
  saveButton.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      showStatusMessage('Please enter your OpenAI API key', 'error');
      return;
    }
    
    // Save API key locally
    chrome.storage.local.set({ openaiApiKey: apiKey }, function() {
      showStatusMessage('Settings saved successfully!', 'success');
    });
  });
  
  function showStatusMessage(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message ' + type;
    
    setTimeout(function() {
      statusMessage.className = 'status-message';
    }, 3000);
  }
});