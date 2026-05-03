// =============================
// DOM ELEMENTS
// =============================
const fileInput = document.getElementById("fileInput");
const fileStatus = document.getElementById("fileStatus");
const chooseBtn = document.querySelector(".btn-ai"); // Assuming this is your "Choose File" button
const viewAnalysisBtn = document.getElementById("viewAnalysisBtn");
const viewFullAnalysisBtn = document.getElementById("viewFullAnalysisBtn");
const fileNameDisplay = document.getElementById("fileName");

// =============================
// NEW: HELPER TO UPDATE STATUS MESSAGE
// This one function will handle all message types (success, error, info).
// =============================
function updateStatus(message, type) {
    // Clear any previous styling
    fileStatus.className = "status-message";
    fileStatus.innerHTML = message;
    fileStatus.style.display = "block"; // Make sure it's visible

    if (type === 'success') {
        fileStatus.classList.add('success'); // Uses CSS for styling (cleaner)
        // You would define .status-message.success in your CSS
        // For now, JS styling is fine to match the request:
        fileStatus.style.background = "#e6ffed";
        fileStatus.style.border = "1px solid #34a853";
        fileStatus.style.borderRadius = "8px";
        fileStatus.style.padding = "10px";
        fileStatus.style.color = "#155724";
        fileStatus.style.fontWeight = "500";
    } else if (type === 'error') {
        fileStatus.classList.add('error');
        fileStatus.style.background = "#3ed03bff";
        fileStatus.style.border = "1px solid green";
        fileStatus.style.borderRadius = "8px";
        fileStatus.style.padding = "10px";
        fileStatus.style.color = "green";
        fileStatus.style.fontWeight = "500";
    } else { // 'info' or uploading message
        fileStatus.style.background = "transparent";
        fileStatus.style.border = "none";
        fileStatus.style.color = "blue";
        fileStatus.style.fontWeight = "normal";
    }
}


// =============================
// NEW: FUNCTIONS TO UPDATE ANALYSIS VIEW AND DASHBOARD
// =============================

// Function to show analysis view
function showAnalysisView(fileName) {
    const uploadArea = document.getElementById("uploadArea");
    const analysisView = document.getElementById("analysisView");
    const fileNameElement = document.getElementById("fileName");
    const fileStatus = document.getElementById("fileStatus");
    const progressSection = document.getElementById("progressSection");
    const resultsPreview = document.getElementById("resultsPreview");
    const actionButtons = document.getElementById("actionButtons");

    if (uploadArea) uploadArea.style.display = "none";
    if (analysisView) analysisView.style.display = "block";
    if (fileNameElement) fileNameElement.textContent = fileName;
    if (fileStatus) fileStatus.textContent = "Analysis Complete";
    if (progressSection) progressSection.style.display = "none";
    if (resultsPreview) resultsPreview.style.display = "block";
    if (actionButtons) actionButtons.style.display = "flex";
}

// Function to update analysis results
function updateAnalysisResults(result, fileName) {
    // Update results preview cards
    const resultCards = document.querySelectorAll('.result-card');
    
    if (resultCards.length >= 3) {
        // Update summary card
        const summaryCard = resultCards[0];
        summaryCard.querySelector('.result-title').textContent = 'AI Summary';
        summaryCard.querySelector('.result-subtitle').textContent = 'Generated using OpenAI';
        
        // Update risk card
        const riskCard = resultCards[1];
        riskCard.querySelector('.result-title').textContent = 'Risk Analysis';
        riskCard.querySelector('.result-subtitle').textContent = result.message || 'Analysis complete';
        
        // Update clauses card
        const clausesCard = resultCards[2];
        clausesCard.querySelector('.result-title').textContent = 'Document Processed';
        clausesCard.querySelector('.result-subtitle').textContent = result.filename || fileName;
    }

    // Update analysis info
    const analysisInfo = document.getElementById("analysisInfo");
    if (analysisInfo) {
        analysisInfo.innerHTML = `
            <p><strong>Document:</strong> ${fileName}</p>
            <p><strong>Risk Level:</strong> ${result.risk || 'Unknown'}</p>
            <p><strong>Analysis:</strong> AI-powered with OpenAI GPT-4</p>
        `;
        analysisInfo.style.display = "block";
    }
}

// Function to update dashboard
function updateDashboard(result) {
    const dashboardSection = document.getElementById("dashboard");
    if (!dashboardSection) return;

    // Update main document card
    const documentTitle = dashboardSection.querySelector('.document-title');
    const documentMeta = dashboardSection.querySelector('.document-meta');
    const statusBadge = dashboardSection.querySelector('.status-badge');
    
    if (documentTitle) documentTitle.textContent = result.filename || 'Analyzed Document';
    if (documentMeta) documentMeta.textContent = `Uploaded just now • AI Analysis Complete`;
    if (statusBadge) statusBadge.textContent = 'Analysis Complete';

    // Update summary section
    const summaryContent = dashboardSection.querySelector('.summary-content p');
    if (summaryContent && result.summary) {
        summaryContent.textContent = result.summary;
    }

    // Update risk analysis section
    const riskLevel = dashboardSection.querySelector('.risk-level');
    const riskDescription = dashboardSection.querySelector('.risk-description');
    
    if (riskLevel && result.risk) {
        riskLevel.textContent = result.risk;
        riskLevel.className = `risk-level ${result.risk.toLowerCase()}`;
    }
    if (riskDescription && result.message) {
        riskDescription.textContent = result.message;
    }

    // Update recent files section
    const recentFilesList = dashboardSection.querySelector('.recent-files-list');
    if (recentFilesList && result.recent_files) {
        recentFilesList.innerHTML = '';
        result.recent_files.forEach(file => {
            const li = document.createElement('li');
            li.innerHTML = `
                <i data-lucide="file-text"></i>
                <span>${file}</span>
                <small>Recent</small>
            `;
            recentFilesList.appendChild(li);
        });
        
        // Re-initialize Lucide icons for new elements
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    // Show dashboard section
    dashboardSection.style.display = "block";
    dashboardSection.scrollIntoView({ behavior: 'smooth' });
}


// =============================
// CHOOSE FILE BUTTON LOGIC
// =============================
if (chooseBtn && fileInput) {
    chooseBtn.addEventListener("click", () => fileInput.click());
}

// =============================
// NEW: FUNCTIONS TO UPDATE ANALYSIS VIEW AND DASHBOARD
// =============================

// Function to show analysis view
function showAnalysisView(fileName) {
    const uploadArea = document.getElementById("uploadArea");
    const analysisView = document.getElementById("analysisView");
    const fileNameElement = document.getElementById("fileName");
    const fileStatus = document.getElementById("fileStatus");
    const progressSection = document.getElementById("progressSection");
    const resultsPreview = document.getElementById("resultsPreview");
    const actionButtons = document.getElementById("actionButtons");

    if (uploadArea) uploadArea.style.display = "none";
    if (analysisView) analysisView.style.display = "block";
    if (fileNameElement) fileNameElement.textContent = fileName;
    if (fileStatus) fileStatus.textContent = "Analysis Complete";
    if (progressSection) progressSection.style.display = "none";
    if (resultsPreview) resultsPreview.style.display = "block";
    if (actionButtons) actionButtons.style.display = "flex";
}

// Function to update analysis results
function updateAnalysisResults(result, fileName) {
    // Update results preview cards
    const resultCards = document.querySelectorAll('.result-card');
    
    if (resultCards.length >= 3) {
        // Update summary card
        const summaryCard = resultCards[0];
        summaryCard.querySelector('.result-title').textContent = 'AI Summary';
        summaryCard.querySelector('.result-subtitle').textContent = 'Generated using OpenAI';
        
        // Update risk card
        const riskCard = resultCards[1];
        riskCard.querySelector('.result-title').textContent = 'Risk Analysis';
        riskCard.querySelector('.result-subtitle').textContent = result.message || 'Analysis complete';
        
        // Update clauses card
        const clausesCard = resultCards[2];
        clausesCard.querySelector('.result-title').textContent = 'Document Processed';
        clausesCard.querySelector('.result-subtitle').textContent = result.filename || fileName;
    }

    // Update analysis info
    const analysisInfo = document.getElementById("analysisInfo");
    if (analysisInfo) {
        analysisInfo.innerHTML = `
            <p><strong>Document:</strong> ${fileName}</p>
            <p><strong>Risk Level:</strong> ${result.risk || 'Unknown'}</p>
            <p><strong>Analysis:</strong> AI-powered with OpenAI GPT-4</p>
        `;
        analysisInfo.style.display = "block";
    }
}

// Function to update dashboard
function updateDashboard(result) {
    const dashboardSection = document.getElementById("dashboard");
    if (!dashboardSection) return;

    // Update main document card
    const documentTitle = dashboardSection.querySelector('.document-title');
    const documentMeta = dashboardSection.querySelector('.document-meta');
    const statusBadge = dashboardSection.querySelector('.status-badge');
    
    if (documentTitle) documentTitle.textContent = result.filename || 'Analyzed Document';
    if (documentMeta) documentMeta.textContent = `Uploaded just now • AI Analysis Complete`;
    if (statusBadge) statusBadge.textContent = 'Analysis Complete';

    // Update summary section
    const summaryContent = dashboardSection.querySelector('.summary-content p');
    if (summaryContent && result.summary) {
        summaryContent.textContent = result.summary;
    }

    // Update risk analysis section
    const riskLevel = dashboardSection.querySelector('.risk-level');
    const riskDescription = dashboardSection.querySelector('.risk-description');
    
    if (riskLevel && result.risk) {
        riskLevel.textContent = result.risk;
        riskLevel.className = `risk-level ${result.risk.toLowerCase()}`;
    }
    if (riskDescription && result.message) {
        riskDescription.textContent = result.message;
    }

    // Update recent files section
    const recentFilesList = dashboardSection.querySelector('.recent-files-list');
    if (recentFilesList && result.recent_files) {
        recentFilesList.innerHTML = '';
        result.recent_files.forEach(file => {
            const li = document.createElement('li');
            li.innerHTML = `
                <i data-lucide="file-text"></i>
                <span>${file}</span>
                <small>Recent</small>
            `;
            recentFilesList.appendChild(li);
        });
        
        // Re-initialize Lucide icons for new elements
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    // Show dashboard section
    dashboardSection.style.display = "block";
    dashboardSection.scrollIntoView({ behavior: 'smooth' });
}
if (fileInput) {
    fileInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (file) {
            // Step 1️⃣ Show Uploading Message
            updateStatus(`📤 Uploading and analyzing "<b>${file.name}</b>"...`, 'info');

            try {
                // Step 2️⃣ Call /analyze endpoint for risk analysis and summary
                const analyzeFormData = new FormData();
                analyzeFormData.append("file", file);

                const analyzeResponse = await fetch("http://127.0.0.1:8016/analyze", {
                    method: "POST",
                    body: analyzeFormData,
                });

                if (!analyzeResponse.ok) {
                    throw new Error(`Analysis failed: ${analyzeResponse.status}`);
                }

                const analyzeResult = await analyzeResponse.json();
                console.log("📊 Analysis result:", analyzeResult);

                // Step 3️⃣ Call /extract-clauses endpoint for clause extraction
                const clausesFormData = new FormData();
                clausesFormData.append("file", file);

                const clausesResponse = await fetch("http://127.0.0.1:8016/extract-clauses", {
                    method: "POST",
                    body: clausesFormData,
                });

                let clausesResult = { clauses: [] };
                if (clausesResponse.ok) {
                    clausesResult = await clausesResponse.json();
                    console.log("📋 Clauses result:", clausesResult);
                } else {
                    console.warn("Clause extraction failed:", clausesResponse.status);
                }

                // Combine results
                const combinedResult = {
                    ...analyzeResult,
                    clauses: clausesResult.clauses || [],
                    uploadedAt: new Date().toISOString()
                };

                console.log("🔄 Combined result:", combinedResult);

                // Step 4️⃣ Update the analysis view with actual results
                updateAnalysisResults(combinedResult, file.name);

                // Step 5️⃣ Show analysis view
                showAnalysisView(file.name);

                // Step 6️⃣ Update dashboard with all results
                updateDashboard(combinedResult);

                // Store in session storage for other pages
                sessionStorage.setItem('analyzedFileName', file.name);
                sessionStorage.setItem('analysisResult', JSON.stringify(combinedResult));

                // Show success message
                updateStatus("✅ Document analyzed successfully!", 'success');

            } catch (error) {
                console.error("❌ Analysis Error:", error);
                updateStatus(`❌ Analysis failed: ${error.message}`, 'error');
            }
        }
    });
}

// =============================
// REDIRECTS & OTHER LISTENERS (Unchanged)
// =============================
if (viewAnalysisBtn) {
    viewAnalysisBtn.addEventListener("click", () => {
        window.location.href = "analysis.html";
    });
}

if (viewFullAnalysisBtn && fileNameDisplay) {
    viewFullAnalysisBtn.addEventListener("click", () => {
        window.location.href = `analysis.html?file=${encodeURIComponent(fileNameDisplay.textContent)}`;
    });
}

document.getElementById("exportReportBtn")?.addEventListener("click", () => {
    document.getElementById("exportStatus").style.display = "block";
});

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', function() {
    const dashboardSection = document.getElementById("dashboard");
    if (dashboardSection) {
        dashboardSection.style.display = "block";
        initializeDashboard();
    }
});

// Function to initialize dashboard with default content
function initializeDashboard() {
    const dashboardSection = document.getElementById("dashboard");
    if (!dashboardSection) return;

    // Set default content for when no document is uploaded
    const documentTitle = dashboardSection.querySelector('.document-title');
    const documentMeta = dashboardSection.querySelector('.document-meta');
    const statusBadge = dashboardSection.querySelector('.status-badge');
    
    if (documentTitle) documentTitle.textContent = 'No Document Analyzed Yet';
    if (documentMeta) documentMeta.textContent = 'Upload a legal document to get AI-powered analysis';
    if (statusBadge) {
        statusBadge.textContent = 'Ready to Analyze';
        statusBadge.style.background = '#e0e5ff';
        statusBadge.style.color = '#3730a3';
    }

    // Set default summary
    const summaryParagraphs = dashboardSection.querySelectorAll('.summary-content .summary-paragraph');
    if (summaryParagraphs.length > 0) {
        summaryParagraphs[0].textContent = 'Upload a legal document to receive AI-generated summaries, risk analysis, and key insights powered by OpenAI GPT-4.';
        if (summaryParagraphs.length > 1) {
            summaryParagraphs[1].style.display = 'block';
            summaryParagraphs[1].textContent = 'Our AI analyzes contracts, agreements, and legal documents to identify potential risks, extract key clauses, and provide plain-language explanations.';
        }
    }

    // Set default risk analysis
    const riskBadge = dashboardSection.querySelector('.risk-badge');
    if (riskBadge) riskBadge.textContent = 'No Analysis Yet';
}

document.getElementById("downloadSummaryBtn")?.addEventListener("click", () => {
    document.getElementById("summaryStatus").style.display = "block";
});

document.getElementById("viewRiskBtn")?.addEventListener("click", () => {
    window.location.href = "risk.html";
});

const riskLink1 = document.getElementsByClassName("risk-link1");
if (riskLink1.length) {
    Array.from(riskLink1).forEach((el) => {
        el.addEventListener("click", () => {
            window.location.href = "clause1.html";
        });
    });
}