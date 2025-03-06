document.addEventListener('DOMContentLoaded', function() {
  // Load saved API key
  chrome.storage.local.get(['apiKey'], function(result) {
    if (result.apiKey) {
      document.getElementById('apiKey').value = result.apiKey;
    }
  });

  document.getElementById('saveSettings').addEventListener('click', async function() {
    const apiKey = document.getElementById('apiKey').value;
    const resumeFile = document.getElementById('resume').files[0];

    if (apiKey) {
      chrome.storage.local.set({ apiKey: apiKey });
    }

    if (resumeFile) {
      // Convert resume to base64
      const reader = new FileReader();
      reader.onload = async function(e) {
        const base64Resume = e.target.result;
        chrome.storage.local.set({ resume: base64Resume });
      };
      reader.readAsDataURL(resumeFile);
    }

    alert('Settings saved successfully!');
  });
}); 