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

// Function to extract just the job title and description
function extractJobInfo() {
  // Try to find job title
  let jobTitle = '';
  const possibleTitleElements = document.querySelectorAll('h1, h2, .job-title, [class*="title"], [class*="position"]');
  for (const element of possibleTitleElements) {
    const text = element.innerText.trim();
    if (text && text.length < 100) {
      jobTitle = text;
      break;
    }
  }
  
  // Get main content - prioritize job description sections
  const jobDescriptionSelectors = [
    '.job-description',
    '#job-description',
    '[class*="description"]',
    '[class*="details"]',
    'article',
    'main',
    '.main-content'
  ];
  
  let jobDescription = '';
  for (const selector of jobDescriptionSelectors) {
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      const text = element.innerText.trim();
      if (text && text.length > 200 && text.length < 3000) {
        jobDescription = text;
        break;
      }
    }
    if (jobDescription) break;
  }
  
  // If still no description, use a smaller portion of the page content
  if (!jobDescription) {
    const bodyText = document.body.innerText;
    jobDescription = bodyText.slice(0, 2000);
  }
  
  return {
    title: jobTitle,
    description: jobDescription.slice(0, 3000) // Limit to 3000 chars to avoid token limits
  };
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
    
    // Get job information
    const jobInfo = extractJobInfo();
    
    if (!jobInfo.description) {
      showError('Could not extract job description from this page.');
      return;
    }
    
    // Extract key resume information instead of using the full resume
    const resumeData = settings.resume.data;
    
    // Call OpenAI API with optimized content
    const response = await callOpenAIWithTokenOptimization(
      settings.openaiApiKey, 
      type, 
      jobInfo, 
      resumeData
    );
    
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

// Optimize for token usage to avoid OpenAI limits
async function callOpenAIWithTokenOptimization(apiKey, type, jobInfo, resumeData) {
  try {
    // Create a summarized version of the resume data to reduce tokens
    const resumeSummary = extractResumeInfo(resumeData);
    
    // Prepare optimized prompt based on document type
    const systemPrompt = type === 'resume' 
      ? `You are an expert resume tailor. Create a concise, targeted resume based on the provided resume information and job description. Focus on relevant skills and experiences only.`
      : `You are an expert cover letter writer. Create a professional, tailored cover letter that highlights relevant qualifications from the resume for the specific job posting.`;
    
    const userPrompt = `
      Job Title: ${jobInfo.title}
      
      Job Description: 
      ${jobInfo.description}
      
      My Resume Information:
      ${resumeSummary}
      
      Please create a tailored ${type === 'resume' ? 'resume' : 'cover letter'} for this job posting.
      ${type === 'resume' ? 'Include only relevant sections and skills.' : 'Keep it to one page and professional in tone.'}
    `;
    
    // Call OpenAI with a more efficient model and token settings
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Using 3.5 which has higher token limits and is more cost-effective
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        max_tokens: 1500,
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

// Extract key information from resume to reduce tokens
function extractResumeInfo(resumeData) {
  // In a real implementation, this would parse the resume
  // For now, we'll just create a placeholder for the concept
  
  // Simplified resume data would extract:
  // - Name & Contact
  // - Skills list
  // - Recent job titles, companies, and dates
  // - Education highlights
  
  // Limiting to 1000 characters total
  return resumeData.length > 1000 ? resumeData.slice(0, 1000) + "..." : resumeData;
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