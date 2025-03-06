// Add buttons to the page
function addButtons() {
  const buttonContainer = document.createElement('div');
  buttonContainer.style.position = 'fixed';
  buttonContainer.style.bottom = '20px';
  buttonContainer.style.right = '20px';
  buttonContainer.style.zIndex = '9999';

  const generateResumeBtn = document.createElement('button');
  generateResumeBtn.textContent = 'Generate Resume';
  generateResumeBtn.style.marginRight = '10px';
  generateResumeBtn.addEventListener('click', () => generateDocument('resume'));

  const generateCoverLetterBtn = document.createElement('button');
  generateCoverLetterBtn.textContent = 'Generate Cover Letter';
  generateCoverLetterBtn.addEventListener('click', () => generateDocument('coverLetter'));

  buttonContainer.appendChild(generateResumeBtn);
  buttonContainer.appendChild(generateCoverLetterBtn);
  document.body.appendChild(buttonContainer);
}

async function generateDocument(type) {
  // Get the job description from the page
  const jobDescription = document.body.innerText;

  // Get stored API key and resume
  const { apiKey, resume } = await chrome.storage.local.get(['apiKey', 'resume']);

  if (!apiKey) {
    alert('Please set your OpenAI API key in the extension popup');
    return;
  }

  if (!resume) {
    alert('Please upload your resume in the extension popup');
    return;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a professional resume and cover letter writer. Use the provided resume and job description to create a tailored ${type}.`
          },
          {
            role: "user",
            content: `Resume: ${resume}\n\nJob Description: ${jobDescription}\n\nPlease generate a tailored ${type}.`
          }
        ]
      })
    });

    const data = await response.json();
    
    // Create a popup with the generated content
    const popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.backgroundColor = 'white';
    popup.style.padding = '20px';
    popup.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    popup.style.maxHeight = '80vh';
    popup.style.overflow = 'auto';
    popup.style.zIndex = '10000';

    const content = document.createElement('pre');
    content.textContent = data.choices[0].message.content;
    
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Close';
    closeButton.onclick = () => popup.remove();

    popup.appendChild(content);
    popup.appendChild(closeButton);
    document.body.appendChild(popup);

  } catch (error) {
    alert('Error generating document: ' + error.message);
  }
}

// Add buttons when the page loads
addButtons(); 