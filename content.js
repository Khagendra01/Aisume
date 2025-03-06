// Create and inject UI elements
function injectAisumeButtons() {
  // Create container
  const container = document.createElement('div');
  container.className = 'aisume-container';
  
  // Create resume button
  const resumeButton = document.createElement('button');
  resumeButton.className = 'aisume-button';
  resumeButton.id = 'aisume-resume-button';
  resumeButton.innerHTML = '<span>Generate Resume</span>';
  
  // Create cover letter button
  const coverLetterButton = document.createElement('button');
  coverLetterButton.className = 'aisume-button';
  coverLetterButton.id = 'aisume-cover-letter-button';
  coverLetterButton.innerHTML = '<span>Generate Cover Letter</span>';
  
  // Create output container
  const outputContainer = document.createElement('div');
  outputContainer.className = 'aisume-output-container';
  outputContainer.id = 'aisume-output';
  outputContainer.style.display = 'none';
  
  // Add buttons to container
  container.appendChild(resumeButton);
  container.appendChild(coverLetterButton);
  container.appendChild(outputContainer);
  
  // Add container to body
  document.body.appendChild(container);
  
  // Add event listeners
  resumeButton.addEventListener('click', () => generateDocument('resume'));
  coverLetterButton.addEventListener('click', () => generateDocument('coverLetter'));
}

// Function to scrape job description
function scrapeJobDescription() {
  // Get all visible text from the body
  const bodyText = document.body.innerText;
  
  // Basic text cleaning
  const cleanText = bodyText
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000); // Limit to 5000 chars to avoid token limits
    
  return cleanText;
}

// Function to generate document
async function generateDocument(type) {
  const outputElement = document.getElementById('aisume-output');
  outputElement.style.display = 'block';
  outputElement.innerHTML = '<div class="aisume-loading">Processing...</div>';
  
  try {
    // Get settings from storage
    const settings = await new Promise(resolve => {
      chrome.storage.local.get(['openaiApiKey', 'resume'], (result) => {
        resolve(result);
      });
    });
    
    if (!settings.openaiApiKey) {
      showError('OpenAI API key not found. Please add it in the extension popup.');
      return;
    }
    
    if (!settings.resume) {
      showError('Resume not found. Please upload it in the extension popup.');
      return;
    }
    
    // Get job description
    const jobDescription = scrapeJobDescription();
    
    if (!jobDescription) {
      showError('Could not extract job description from this page.');
      return;
    }
    
    // Prepare prompt based on document type
    const prompt = type === 'resume' 
      ? `Generate a tailored resume based on my existing resume and this job description. Focus on relevant skills and experiences.`
      : `Generate a tailored cover letter based on my resume and this job description. Make it professional and highlight my relevant qualifications.`;
    
    // Get resume text (normally we'd parse, but using placeholder here)
    const resumeText = settings.resume.data;
    
    // Call OpenAI API
    const response = await callOpenAI(settings.openaiApiKey, prompt, jobDescription, resumeText);
    
    // Display the result
    outputElement.innerHTML = `
      <div class="aisume-result">
        <h3>Your Tailored ${type === 'resume' ? 'Resume' : 'Cover Letter'}</h3>
        <div class="aisume-content">${formatOutput(response)}</div>
        <div class="aisume-actions">
          <button id="aisume-copy">Copy to Clipboard</button>
          <button id="aisume-download">Download as Text</button>
          <button id="aisume-close">Close</button>
        </div>
      </div>
    `;
    
    // Add event listeners for actions
    document.getElementById('aisume-copy').addEventListener('click', () => {
      navigator.clipboard.writeText(response);
      alert('Copied to clipboard!');
    });
    
    document.getElementById('aisume-download').addEventListener('click', () => {
      downloadText(response, `Tailored_${type === 'resume' ? 'Resume' : 'Cover_Letter'}.txt`);
    });
    
    document.getElementById('aisume-close').addEventListener('click', () => {
      outputElement.style.display = 'none';
    });
    
  } catch (error) {
    showError(`Error: ${error.message}`);
  }
}

// Function to call OpenAI API
async function callOpenAI(apiKey, prompt, jobDescription, resumeText) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o', // or another appropriate model
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant that tailors resumes and cover letters based on job descriptions.'
          },
          {
            role: 'user',
            content: `
              ${prompt}
              
              Job Description:
              ${jobDescription}
              
              My Resume:
              ${resumeText}
            `
          }
        ],
        max_tokens: 2000,
        temperature: 0.7
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw error;
  }
}

// Format output with line breaks
function formatOutput(text) {
  return text.replace(/\n/g, '<br>');
}

// Download text as file
function downloadText(text, filename) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Show error message
function showError(message) {
  const outputElement = document.getElementById('aisume-output');
  outputElement.innerHTML = `
    <div class="aisume-error">
      <p>${message}</p>
      <button id="aisume-close-error">Close</button>
    </div>
  `;
  
  document.getElementById('aisume-close-error').addEventListener('click', () => {
    outputElement.style.display = 'none';
  });
}

// Initialize on page load
window.addEventListener('load', injectAisumeButtons);