// AIChat+ Assistant - Main Application Script
class AIChatApp {
    constructor() {
        this.currentChatId = 'current';
        this.chats = JSON.parse(localStorage.getItem('aichat-chats')) || {};
        this.isTyping = false;
        this.voiceRecognition = null;
        this.synth = window.speechSynthesis;
        this.installPrompt = null;
        
        // Settings
        this.settings = JSON.parse(localStorage.getItem('aichat-settings')) || {
            darkMode: true,
            autoScroll: true,
            voiceResponses: true
        };
        this.languages = {
  hi: "Hindi",
  en: "English",
  bn: "Bengali",
  mr: "Marathi",
  ta: "Tamil",
  te: "Telugu",
  gu: "Gujarati",
  es: "Spanish",
  fr: "French",
  de: "German",
  ar: "Arabic"
};
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
        this.loadCurrentChat();
        this.initPWA();
        this.initServiceWorker();
        this.checkConnection();
        this.hideSplash();
        this.updateConnectionStatus();
    }

    cacheElements() {
        this.elements = {
            appContainer: document.getElementById('app-container'),
            sidebar: document.getElementById('sidebar'),
            messagesContainer: document.getElementById('messages-container'),
            welcomeScreen: document.getElementById('welcome-screen'),
            messageInput: document.getElementById('message-input'),
            sendBtn: document.getElementById('send-btn'),
            newChatBtn: document.getElementById('new-chat-btn'),
            clearAllBtn: document.getElementById('clear-all-btn'),
            voiceBtn: document.getElementById('voice-btn'),
            settingsBtn: document.getElementById('settings-btn'),
            settingsModal: document.getElementById('settings-modal'),
            closeSettings: document.getElementById('close-settings'),
            loadingOverlay: document.getElementById('loading-overlay'),
            installBtn: document.getElementById('install-btn'),
            connectionStatus: document.getElementById('connection-status'),
            promptBtns: document.querySelectorAll('.prompt-btn'),
            darkModeToggle: document.getElementById('dark-mode-toggle'),
            autoScrollToggle: document.getElementById('auto-scroll-toggle'),
            voiceResponseToggle: document.getElementById('voice-response-toggle')
        };
    }

    bindEvents() {
        // Message input
        this.elements.messageInput.addEventListener('input', () => this.toggleSendButton());
        this.elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Buttons
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
        this.elements.newChatBtn.addEventListener('click', () => this.newChat());
        this.elements.clearAllBtn.addEventListener('click', () => this.clearAllChats());
        this.elements.voiceBtn.addEventListener('click', () => this.toggleVoiceInput());
        this.elements.settingsBtn.addEventListener('click', () => this.toggleSettings());
        this.elements.closeSettings.addEventListener('click', () => this.toggleSettings());
        
        // Settings toggles
        this.elements.darkModeToggle.addEventListener('change', (e) => this.updateSetting('darkMode', e.target.checked));
        this.elements.autoScrollToggle.addEventListener('change', (e) => this.updateSetting('autoScroll', e.target.checked));
        this.elements.voiceResponseToggle.addEventListener('change', (e) => this.updateSetting('voiceResponses', e.target.checked));

        // Prompt buttons
        this.elements.promptBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const prompt = btn.dataset.prompt;
                this.elements.messageInput.value = prompt;
                this.toggleSendButton();
                this.elements.messageInput.focus();
            });
        });

        // Close modal on background click
        this.elements.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.elements.settingsModal) this.toggleSettings();
        });

        // Window events
        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener('online', () => this.updateConnectionStatus());
        window.addEventListener('offline', () => this.updateConnectionStatus());
    }

    async sendMessage() {
        const message = this.elements.messageInput.value.trim();
        function generateAIResponse(text) {
  text = text.toLowerCase();

  if (text.includes("hello")) {
    return "Hello! मैं HarshAI हूँ 😊 मैं आपकी कैसे मदद कर सकता हूँ?";
  }

  if (text.includes("who are you")) {
    return "मैं HarshAI हूँ 🤖";
  }

  return "मैंने आपका सवाल समझ लिया 👍 (demo mode)";
}
        const lang = document.getElementById("languageSelect").value;
        if (!message || this.isTyping) return;

        // Add user message
        this.addMessage(message, 'user');
        this.elements.messageInput.value = '';
        this.toggleSendButton();

        // Show typing indicator
        this.showTypingIndicator();
        this.isTyping = true;

        // Simulate AI response (demo mode)
        setTimeout(() => {
    const reply = this.generateAIResponse(message);
    this.hideTypingIndicator();
    this.addMessage(reply, 'ai');
    this.isTyping = false;
}, 1000);
    }

    addMessage(content, sender, options = {}) {
        const messageId = Date.now().toString();
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        messageDiv.dataset.messageId = messageId;

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${sender === 'user' ? '👤' : '🤖'}</div>
            <div class="message-content">
                <div class="message-text">${this.formatMessage(content)}</div>
                <div class="message-time">${time}</div>
                <div class="message-actions">
                    <button class="copy-btn" title="Copy" onclick="app.copyMessage('${messageId}')">📋</button>
                    ${sender === 'ai' ? `<button class="voice-btn-small" title="Listen" onclick="app.speakMessage('${messageId}')">🔊</button>` : ''}
                </div>
            </div>
        `;

        this.elements.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
        this.showChatArea();
    }

    formatMessage(text) {
        // Simple markdown-like formatting
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai typing-indicator';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        this.elements.messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    async generateAIResponse(userMessage) {
        this.hideTypingIndicator();
        this.hideLoading();

        // Demo AI responses based on keywords
        const responses = {
            'quantum': "Quantum computing uses qubits that can exist in multiple states simultaneously thanks to superposition. Unlike classical bits (0 or 1), qubits can be 0, 1, or both at once. This allows quantum computers to solve complex problems much faster than classical computers for specific tasks like cryptography and optimization.",
            'quote': "💫 *'The only way to do great work is to love what you do.'* – Steve Jobs\n\nKeep pushing forward! 🚀",
            'plan': "Here's a simple daily plan template:\n\n**Morning:**\n• 7:00 AM - Wake up & hydrate\n• 7:30 AM - Exercise (30 min)\n• 8:00 AM - Breakfast & plan day\n\n**Work:**\n• 9:00 AM - Deep work (2 hrs)\n• 11:00 AM - Break & emails\n• 11:30 AM - Meetings\n\n**Afternoon:**\n• 1:00 PM - Lunch\n• 2:00 PM - Creative work\n• 4:00 PM - Review progress",
            'fact': "🌀 *Fun Fact:* Octopuses have three hearts! Two pump blood through the gills, while the third pumps it through the rest of the body. Nature is amazing! 🌊",
            'default': `Great question about "${userMessage}"! 

Here's what I can tell you:

${this.getDemoResponse(userMessage)}

What else would you like to know? 😊`
        };

        let response = responses.default;
        
        // Match keywords
        for (const [key, value] of Object.entries(responses)) {
            if (userMessage.toLowerCase().includes(key) && key !== 'default') {
                response = value;
                break;
            }
        }

        this.addMessage(response, 'ai');
        this.saveCurrentChat();

        // Speak response if enabled
        if (this.settings.voiceResponses) {
            setTimeout(() => this.speakText(response), 500);
        }

        this.isTyping = false;
    }

    getDemoResponse(message) {
        const topics = [
            "This is a demo response showing how AIChat+ works offline with realistic responses.",
            "The app saves all your chats locally and works as a full PWA!",
            "Try asking about quantum computing, quotes, planning, or fun facts!",
            "Voice input and text-to-speech work perfectly too!"
        ];
        return topics[Math.floor(Math.random() * topics.length)];
    }

    toggleSendButton() {
        const message = this.elements.messageInput.value.trim();
        this.elements.sendBtn.disabled = !message;
    }

    newChat() {
        this.currentChatId = 'chat_' + Date.now();
        this.chats[this.currentChatId] = [];
        this.elements.messagesContainer.innerHTML = '';
        this.elements.welcomeScreen.classList.remove('hidden');
        this.saveChats();
        this.updateChatHistory();
    }

    loadCurrentChat() {
        const chat = this.chats[this.currentChatId] || [];
        this.elements.messagesContainer.innerHTML = '';
        
        chat.forEach(msg => {
            this.addMessage(msg.content, msg.sender);
        });

        if (chat.length > 0) {
            this.showChatArea();
        }
    }

    saveCurrentChat() {
        const messages = Array.from(this.elements.messagesContainer.children).map(msg => {
            const text = msg.querySelector('.message-text').textContent;
            const sender = msg.classList.contains('user') ? 'user' : 'ai';
            return { content: text, sender, timestamp: Date.now() };
        });
        
        this.chats[this.currentChatId] = messages;
        this.saveChats();
    }

    saveChats() {
        localStorage.setItem('aichat-chats', JSON.stringify(this.chats));
        this.updateChatHistory();
    }

    updateChatHistory() {
        const chatHistory = document.querySelector('.chat-history');
        chatHistory.innerHTML = `
            <div class="chat-item active" data-chat-id="${this.currentChatId}">
                <span class="chat-icon">💬</span>
                <div class="chat-info">
                    <div class="chat-title">Current Chat</div>
                    <div class="chat-preview">${this.getChatPreview()}</div>
                </div>
            </div>
        `;
    }

    getChatPreview() {
        const messages = this.chats[this.currentChatId] || [];
        if (messages.length === 0) return 'New conversation...';
        
        const lastUserMsg = messages.filter(m => m.sender === 'user').pop();
        return lastUserMsg ? lastUserMsg.content.substring(0, 30) + '...' : 'New conversation...';
    }

    clearAllChats() {
        if (confirm('Clear all chat history? This cannot be undone.')) {
            this.chats = {};
            localStorage.removeItem('aichat-chats');
            this.newChat();
        }
    }

    showChatArea() {
        this.elements.welcomeScreen.classList.add('hidden');
        this.elements.messagesContainer.classList.remove('hidden');
    }

    scrollToBottom() {
        if (this.settings.autoScroll) {
            this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
        }
    }

    copyMessage(messageId) {
        const message = document.querySelector(`[data-message-id="${messageId}"] .message-text`).textContent;
        navigator.clipboard.writeText(message).then(() => {
            // Show copy feedback
            const btn = event.target;
            const originalText = btn.textContent;
            btn.textContent = '✓';
            btn.style.background = 'rgba(16, 185, 129, 0.3)';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
            }, 1000);
        });
    }

    speakMessage(messageId) {
        const text = document.querySelector(`[data-message-id="${messageId}"] .message-text`).textContent;
        this.speakText(text);
    }

    speakText(text) {
        if (!this.settings.voiceResponses || !this.synth) return;

        this.synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        this.synth.speak(utterance);
    }

    async toggleVoiceInput() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Voice input not supported in this browser');
            return;
        }

        if (!this.voiceRecognition) {
            this.startVoiceInput();
        } else {
            this.stopVoiceInput();
        }
    }

    startVoiceInput() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.voiceRecognition = new SpeechRecognition();
        
        this.voiceRecognition.continuous = false;
        this.voiceRecognition.interimResults = false;
        this.voiceRecognition.lang = 'en-US';

        this.voiceRecognition.onstart = () => {
            this.elements.voiceBtn.classList.add('listening');
            this.elements.micIcon.classList.add('listening');
        };

        this.voiceRecognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.elements.messageInput.value = transcript;
            this.toggleSendButton();
            this.elements.messageInput.focus();
        };

        this.voiceRecognition.onend = () => {
            this.stopVoiceInput();
        };

        this.voiceRecognition.onerror = () => {
            this.stopVoiceInput();
        };

        this.voiceRecognition.start();
    }

    stopVoiceInput() {
        if (this.voiceRecognition) {
            this.voiceRecognition.stop();
            this.voiceRecognition = null;
        }
        this.elements.voiceBtn.classList.remove('listening');
    }

    toggleSettings() {
        this.elements.settingsModal.classList.toggle('hidden');
    }

    updateSetting(key, value) {
        this.settings[key] = value;
        localStorage.setItem('aichat-settings', JSON.stringify(this.settings));
    }

    initPWA() {
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            this.elements.installBtn.classList.remove('hidden');
        });

        this.elements.installBtn.addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    this.elements.installBtn.classList.add('hidden');
                    deferredPrompt = null;
                }
            }
        });

        window.addEventListener('appinstalled', () => {
            this.elements.installBtn.classList.add('hidden');
        });
    }

    initServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('SW registered'))
                .catch(err => console.log('SW registration failed'));
        }
    }

    checkConnection() {
        this.updateConnectionStatus();
    }

    updateConnectionStatus() {
        const isOnline = navigator.onLine;
        this.elements.connectionStatus.textContent = isOnline ? '🟢 Online' : '🔴 Offline';
        this.elements.connectionStatus.className = isOnline ? 'status-online' : 'status-offline';
    }

    handleResize() {
        // Handle mobile sidebar
        if (window.innerWidth < 768) {
            this.elements.sidebar.classList.remove('open');
        }
    }

    hideSplash() {
        setTimeout(() => {
            document.getElementById('splash-screen').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('splash-screen').style.display = 'none';
                this.elements.appContainer.classList.remove('hidden');
            }, 300);
        }, 2000);
    }

    showLoading() {
        this.elements.loadingOverlay.classList.remove('hidden');
    }

    hideLoading() {
        this.elements.loadingOverlay.classList.add('hidden');
    }
}

// Global app instance
let app;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    app = new AIChatApp();
});

// Expose app to global scope for message actions
window.app = app;