// Global variable to store current document context
let currentDocument = null;

// Function to handle file upload
async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('document', file);

  try {
    const response = await fetch("http://127.0.0.1:3000/upload", {
      method: "POST",
      body: formData
    });

    if (response.ok) {
      const data = await response.json();
      currentDocument = data.document;
      addMessage("system", `📄 Document "${data.document.filename}" uploaded successfully. You can now ask questions about it.`);
      return data.document;
    } else {
      const error = await response.json();
      addMessage("system", `❌ Failed to upload document: ${error.error}`);
      return null;
    }
  } catch (error) {
    console.error("Upload error:", error);
    addMessage("system", "❌ Failed to upload document. Please try again.");
    return null;
  }
}

// Function to handle + button click
function handleFileUpload() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.doc,.docx,.txt';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      addMessage("user", `📤 Uploading document: ${file.name}`);
      await uploadDocument(file);
    }
  };
  input.click();
}

function addMessage(sender, text) {
  const messagesDiv = document.getElementById("chatMessages");

  // Convert markdown to HTML for AI messages
  const formattedText = sender === "ai" ? formatMarkdown(text) : escapeHtml(text);

  if (sender === "ai") {
    messagesDiv.innerHTML += `
      <div class="message ai">
        <img src="https://cdn-icons-png.flaticon.com/512/4712/4712035.png" alt="AI">
        <div class="bubble ai-bubble">${formattedText}</div>
      </div>`;
  } else if (sender === "system") {
    messagesDiv.innerHTML += `
      <div class="message system">
        <div class="bubble system-bubble">${formattedText}</div>
      </div>`;
  } else {
    messagesDiv.innerHTML += `
      <div class="message user">
        <div class="bubble user-bubble">${formattedText}</div>
      </div>`;
  }
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addTypingIndicator() {
  const messagesDiv = document.getElementById("chatMessages");
  const id = "typing-" + Date.now();
  messagesDiv.innerHTML += `
    <div class="message ai" id="${id}">
      <img src="https://cdn-icons-png.flaticon.com/512/4712/4712035.png" alt="AI">
      <div class="bubble ai-bubble"><i>Typing...</i></div>
    </div>`;
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

async function sendMessage() {
  const inputField = document.getElementById("userInput");
  const messagesDiv = document.getElementById("chatMessages");
  const userMessage = inputField.value.trim();

  if (!userMessage) return;

  addMessage("user", userMessage);
  inputField.value = "";

  // Show typing indicator
  const typingId = addTypingIndicator();

  // Send message with optional document context
  const requestBody = { message: userMessage };
  if (currentDocument) {
    requestBody.documentId = currentDocument.id;
  }

  try {
    const response = await fetch("http://127.0.0.1:3000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    removeTypingIndicator(typingId);

    if (response.ok) {
      const data = await response.json();
      if (data.reply) {
        addMessage("ai", data.reply);
        speakText(data.reply); // voice output
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      addMessage("system", `❌ Error: ${errorData.error || 'Sorry, I encountered an error. Please try again.'}`);
    }
  } catch (error) {
    removeTypingIndicator(typingId);
    console.error("Chat error:", error);
    addMessage("system", "❌ Network error. Please check your connection and try again.");
  }

  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function sendQuick(text) {
  document.getElementById("userInput").value = text;
  sendMessage();
}

function clearChat() {
  document.getElementById("chatMessages").innerHTML = "";
}

document.getElementById("userInput").addEventListener("keypress", function (e) {
  if (e.key === "Enter") sendMessage();
});

// Add event listener for the + button
document.addEventListener("DOMContentLoaded", function() {
  const addFileBtn = document.querySelector(".add-file-btn");
  if (addFileBtn) {
    addFileBtn.addEventListener("click", handleFileUpload);
  }
});

// Voice output function (placeholder)
function speakText(text) {
  // For now, just log to console. Can be enhanced with Web Speech API later
  console.log("Speaking:", text);
}

// --- Markdown Formatter ---
// Supports: **bold**, newlines, and bullet points (- or * at line start)
function formatMarkdown(str) {
  return escapeHtml(str)
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>") // Bold text
    .replace(/(?:^|\n)(?:-|\*) (.*)/g, "<br>• $1") // Bullet points
    .replace(/\n/g, "<br>"); // Normal newlines
}

// Escape unsafe characters to prevent XSS
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, function (tag) {
    const chars = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return chars[tag] || tag;
  });
}
