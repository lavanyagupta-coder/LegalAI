// =============================
// DOM ELEMENTS
// =============================
const fileInput = document.getElementById("fileInput");
const fileStatus = document.getElementById("fileStatus");
const chooseBtn = document.querySelector(".btn-ai");
const viewAnalysisBtn = document.getElementById("viewAnalysisBtn");
const viewFullAnalysisBtn = document.getElementById("viewFullAnalysisBtn");
const fileNameDisplay = document.getElementById("fileName");

// =============================
// STATUS UPDATE FUNCTION
// =============================
function updateStatus(message, type) {
    if (!fileStatus) return;

    fileStatus.className = "status-message";
    fileStatus.innerHTML = message;
    fileStatus.style.display = "block";

    if (type === 'success') {
        fileStatus.style.background = "#e6ffed";
        fileStatus.style.border = "1px solid #34a853";
        fileStatus.style.borderRadius = "8px";
        fileStatus.style.padding = "10px";
        fileStatus.style.color = "#155724";
        fileStatus.style.fontWeight = "500";
    } else if (type === 'error') {
        fileStatus.style.background = "#ffe6e6";
        fileStatus.style.border = "1px solid #d32f2f";
        fileStatus.style.borderRadius = "8px";
        fileStatus.style.padding = "10px";
        fileStatus.style.color = "#d32f2f";
        fileStatus.style.fontWeight = "500";
    } else {
        fileStatus.style.background = "transparent";
        fileStatus.style.border = "none";
        fileStatus.style.color = "#004aad";
        fileStatus.style.fontWeight = "normal";
    }
}

// =============================
// ANALYSIS VIEW FUNCTIONS
// =============================
function showAnalysisView(fileName) {
    const uploadArea = document.getElementById("uploadArea");
    const analysisView = document.getElementById("analysisView");
    const fileNameElement = document.getElementById("fileName");
    const progressSection = document.getElementById("progressSection");
    const resultsPreview = document.getElementById("resultsPreview");
    const actionButtons = document.getElementById("actionButtons");
    const analysisButton = document.getElementById("viewAnalysisBtn");

    if (uploadArea) uploadArea.style.display = "none";
    if (analysisView) analysisView.style.display = "block";
    if (fileNameElement) fileNameElement.textContent = fileName;
    if (progressSection) progressSection.style.display = "none";
    if (resultsPreview) resultsPreview.style.display = "block";
    if (actionButtons) actionButtons.style.display = "flex";
    if (analysisButton) analysisButton.style.display = "inline-flex";
}

function updateAnalysisResults(result, fileName) {
    // Update results preview cards
    const resultCards = document.querySelectorAll('.result-card');

    if (resultCards.length >= 3) {
        // Update summary card
        const summaryCard = resultCards[0];
        summaryCard.querySelector('.result-title').textContent = 'AI Summary';
        summaryCard.querySelector('.result-subtitle').textContent = result.summary
            ? result.summary.substring(0, 120) + (result.summary.length > 120 ? '...' : '')
            : 'Generated using OpenAI GPT-4';

        // Update risk card
        const riskCard = resultCards[1];
        riskCard.querySelector('.result-title').textContent = 'Risk Analysis';
        riskCard.querySelector('.result-subtitle').textContent = result.message || 'Analysis complete';

        // Update clauses card
        const clausesCard = resultCards[2];
        const clauseCount = result.clauses ? result.clauses.length : 0;
        clausesCard.querySelector('.result-title').textContent = 'Key Clauses';
        clausesCard.querySelector('.result-subtitle').textContent = `${clauseCount} clauses extracted`;
    }

    // Update analysis info with comprehensive details
    const analysisInfo = document.getElementById("analysisInfo");
    if (analysisInfo) {
        const clauseList = result.clauses && result.clauses.length > 0
            ? result.clauses.map(clause => `<li><strong>${clause.title}:</strong> ${clause.summary}</li>`).join('')
            : '<li>No clauses extracted</li>';
        const riskList = result.risks && result.risks.length > 0
            ? result.risks.map(risk => `<li><strong>${risk.severity}:</strong> ${risk.title} - ${risk.description}</li>`).join('')
            : '<li>No specific risks were extracted</li>';
        const stats = result.stats || {};

        analysisInfo.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h3 style="color: #004aad; margin-bottom: 10px;">📄 Document Analysis Report</h3>
                <p><strong>Document:</strong> ${fileName}</p>
                <p><strong>Document Type:</strong> ${result.document_type || 'Legal document'}</p>
                <p><strong>Risk Level:</strong> <span style="color: ${result.risk === 'High' ? '#d32f2f' : result.risk === 'Medium' ? '#f57c00' : '#388e3c'}">${result.risk || 'Unknown'}</span></p>
                <p><strong>Analysis:</strong> ${result.message || 'AI-powered analysis complete'}</p>
            </div>

            <div style="margin-bottom: 20px;">
                <h4 style="color: #004aad;">📋 AI Summary</h4>
                <p>${result.summary || 'No summary available'}</p>
            </div>

            <div style="margin-bottom: 20px;">
                <h4 style="color: #004aad;">🔍 Key Clauses Extracted (${result.clauses ? result.clauses.length : 0})</h4>
                <ul style="line-height: 1.6;">${clauseList}</ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h4 style="color: #004aad;">⚠️ Flagged Risks (${result.risks ? result.risks.length : 0})</h4>
                <ul style="line-height: 1.6;">${riskList}</ul>
            </div>

            <div style="margin-bottom: 20px;">
                <h4 style="color: #004aad;">📊 Analysis Details</h4>
                <p><strong>Analysis Date:</strong> ${new Date(result.uploadedAt || Date.now()).toLocaleString()}</p>
                <p><strong>AI Model:</strong> OpenAI GPT-4o-mini</p>
                <p><strong>Processing:</strong> Risk assessment, summarization, clause extraction</p>
                <p><strong>Readable Characters:</strong> ${stats.text_length || 0}</p>
                <p><strong>File Type:</strong> ${(stats.file_type || '').toUpperCase() || 'Unknown'}</p>
            </div>
        `;
        analysisInfo.style.display = "block";
    }
}

// =============================
// DASHBOARD FUNCTIONS
// =============================
function updateDashboard(result) {
    const dashboardSection = document.getElementById("dashboard");
    if (!dashboardSection) return;

    const documentTitle = dashboardSection.querySelector('.document-title');
    const documentMeta = dashboardSection.querySelector('.document-meta');
    const statusBadge = dashboardSection.querySelector('.status-badge');

    const displayName = result.filename || 'Analyzed Document';
    const displayDate = new Date(result.uploadedAt || Date.now()).toLocaleString();
    const clauseCount = result.clauses ? result.clauses.length : 0;
    const riskLevel = result.risk || 'Unknown';

    const scores = result.scores || {};
    const overallScore = typeof scores.overall === 'number' ? scores.overall : 0;
    const riskFlags = typeof scores.risk_flags === 'number' ? scores.risk_flags : (result.risks || []).length;
    const confidenceScore = typeof scores.confidence === 'number' ? scores.confidence : 0;

    if (documentTitle) documentTitle.textContent = displayName;
    if (documentMeta) {
        const fileType = result.stats?.file_type ? result.stats.file_type.toUpperCase() : 'DOC';
        documentMeta.textContent = `Uploaded ${displayDate} • ${clauseCount} clauses detected • ${fileType}`;
    }
    if (statusBadge) statusBadge.textContent = 'Analysis Complete';

    const metricValues = dashboardSection.querySelectorAll('.metrics-grid .metric-value');
    if (metricValues.length >= 4) {
        metricValues[0].textContent = `${overallScore.toFixed(1)}/10`;
        metricValues[1].textContent = riskFlags;
        metricValues[2].textContent = clauseCount;
        metricValues[3].textContent = `${confidenceScore}%`;
    }

    const summarySection = dashboardSection.querySelector('.summary-content');
    if (summarySection) {
        summarySection.innerHTML = `
            <p class="summary-paragraph">${result.summary || 'No summary available yet.'}</p>
            ${clauseCount > 0 ? `<p class="summary-paragraph warning-text">${clauseCount} clause${clauseCount === 1 ? '' : 's'} were extracted from the document and used to generate your risk and summary insights.</p>` : ''}
        `;
    }

    const riskBadge = dashboardSection.querySelector('.risk-badge');
    if (riskBadge) {
        riskBadge.textContent = `${riskLevel === 'Unknown' ? 'Risk Analysis' : riskLevel + ' Risk'}`;
    }

    const risksList = dashboardSection.querySelector('.risks-list');
    if (risksList) {
        if (result.risks && result.risks.length > 0) {
            risksList.innerHTML = result.risks.slice(0, 3).map(risk => `
                <div class="risk-item ${risk.severity === 'High' ? 'high-risk' : risk.severity === 'Medium' ? 'medium-risk' : 'low-risk'}">
                    <i data-lucide="alert-triangle" class="risk-icon"></i>
                    <div class="risk-content">
                        <h5 class="risk-title">${risk.severity} Risk: ${risk.title}</h5>
                        <p class="risk-description">${risk.description}</p>
                    </div>
                </div>
            `).join('');
        } else {
            risksList.innerHTML = `
                <div class="risk-item ${riskLevel === 'High' ? 'high-risk' : riskLevel === 'Medium' ? 'medium-risk' : 'low-risk'}">
                    <i data-lucide="alert-triangle" class="risk-icon"></i>
                    <div class="risk-content">
                        <h5 class="risk-title">${riskLevel} Risk</h5>
                        <p class="risk-description">${result.message || 'No risk details available.'}</p>
                    </div>
                </div>
            `;
        }
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    dashboardSection.style.display = "block";
    dashboardSection.scrollIntoView({ behavior: 'smooth' });
}

// =============================
// EXPORT FUNCTIONALITY
// =============================
function exportReport(result, fileName) {
    const reportData = {
        documentName: fileName,
        analysisDate: new Date(result.uploadedAt || Date.now()).toISOString(),
        riskLevel: result.risk,
        riskMessage: result.message,
        summary: result.summary,
        clauses: result.clauses || [],
        aiModel: "OpenAI GPT-4o-mini"
    };

    // Create downloadable JSON file
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});

    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `${fileName.replace(/\.[^/.]+$/, "")}_analysis_report.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show export status
        const exportStatusElements = document.querySelectorAll(".exportStatus");
        exportStatusElements.forEach(exportStatus => {
            exportStatus.textContent = "✅ Report exported successfully!";
        exportStatus.style.display = "block";
        exportStatus.style.color = "#388e3c";
        setTimeout(() => {
            exportStatus.style.display = "none";
        }, 3000);
    });
}


// =============================
// FILE UPLOAD HANDLER
// =============================
if (fileInput) {
    fileInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (file) {
            updateStatus(`📤 Uploading and analyzing "<b>${file.name}</b>"...`, 'info');

            try {
                // Call /analyze endpoint for risk analysis and summary
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
                const combinedResult = {
                    ...analyzeResult,
                    uploadedAt: new Date().toISOString()
                };

                console.log("🔄 Combined result:", combinedResult);

                // Update UI with results
                updateAnalysisResults(combinedResult, file.name);
                showAnalysisView(file.name);
                updateDashboard(combinedResult);

                // Store in session storage
                sessionStorage.setItem('analyzedFileName', file.name);
                sessionStorage.setItem('analysisResult', JSON.stringify(combinedResult));

                updateStatus("✅ Document analyzed successfully!", 'success');

            } catch (error) {
                console.error("❌ Analysis Error:", error);
                updateStatus(`❌ Analysis failed: ${error.message}`, 'error');
            }
        }
    });
}

// =============================
// EVENT LISTENERS
// =============================
if (chooseBtn && fileInput) {
    chooseBtn.addEventListener("click", () => fileInput.click());
}

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

// Export report functionality
const exportButtons = document.querySelectorAll(".exportReportBtn");
exportButtons.forEach(button => {
    button.addEventListener("click", () => {
        const result = sessionStorage.getItem('analysisResult');
        const fileName = sessionStorage.getItem('analyzedFileName');

        if (result && fileName) {
            exportReport(JSON.parse(result), fileName);
        } else {
            const exportStatusElements = document.querySelectorAll(".exportStatus");
            exportStatusElements.forEach(exportStatus => {
                exportStatus.textContent = "❌ No analysis data available. Please upload and analyze a document first.";
                exportStatus.style.display = "block";
                exportStatus.style.color = "#d32f2f";
            });
        }
    });
});

// =============================
// INITIALIZATION
// =============================
document.addEventListener('DOMContentLoaded', function() {
    const dashboardSection = document.getElementById("dashboard");
    if (dashboardSection) {
        dashboardSection.style.display = "block";
        initializeDashboard();
    }
});

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
        summaryParagraphs[0].textContent = 'Upload a PDF, DOC, or DOCX file to generate a real summary, risk analysis, and clause review from the document text.';
        if (summaryParagraphs.length > 1) {
            summaryParagraphs[1].style.display = 'block';
            summaryParagraphs[1].textContent = 'The dashboard updates from the uploaded file instead of using fixed demo scores or placeholder risks.';
        }
    }

    const metricValues = dashboardSection.querySelectorAll('.metrics-grid .metric-value');
    if (metricValues.length >= 4) {
        metricValues[0].textContent = '0.0/10';
        metricValues[1].textContent = '0';
        metricValues[2].textContent = '0';
        metricValues[3].textContent = '0%';
    }

    const riskBadge = dashboardSection.querySelector('.risk-badge');
    if (riskBadge) riskBadge.textContent = 'Awaiting Analysis';

    const risksList = dashboardSection.querySelector('.risks-list');
    if (risksList) {
        risksList.innerHTML = `
            <div class="risk-item low-risk">
                <i data-lucide="alert-triangle" class="risk-icon"></i>
                <div class="risk-content">
                    <h5 class="risk-title">No document analyzed yet</h5>
                    <p class="risk-description">Upload a readable document to generate actual risks, scores, and clause findings.</p>
                </div>
            </div>
        `;
    }
}

// Additional event listeners
document.getElementById("downloadSummaryBtn")?.addEventListener("click", () => {
    const exportStatus = document.getElementById("summaryStatus");
    if (exportStatus) exportStatus.style.display = "block";
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
