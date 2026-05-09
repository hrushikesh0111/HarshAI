// HarshAI+ v2.0 - Advanced AI Assistant
class HarshAIApp {
    constructor() {
        this.currentChatId = 'chat_' + Date.now();
        this.chats = JSON.parse(localStorage.getItem('harshai-chats')) || {};
        this.settings = JSON.parse(localStorage.getItem('harshai-settings')) || {
            theme: 'dark',
            language: 'en',
            autoScroll: true,
            voiceResponses: true
        };
        this.currentMode = 'chat';
        this.isTyping = false;
        this.voiceRecognition = null;
        this.synth = window.speechSynthesis;
        this.installPrompt = null;
        this.currentImagePrompt = '';
        
        this.init();
    }

    init() {
        this.cacheElements();
        this.applyTheme();
        this.bindEvents();
        this.loadCurrentChat();
        this.updateChatHistory();
        this.initPWA();
        this.initServiceWorker();
        this.updateConnectionStatus();
        this.hideSplash();
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
            fileBtn: document.getElementById('file-btn'),
            imageGenBtn: document.getElementById('image-gen-btn'),
            mobileMenuBtn: document.getElementById('mobile-menu-btn'),
            loadingOverlay: document.getElementById('loading-overlay'),
            loadingText: document.getElementById('loading-text'),
            connectionStatus: document.getElementById('connection-status'),
            languageSelect: document.getElementById('language-select'),
            darkModeToggle: document.getElementById('dark-mode-toggle'),
            autoScrollToggle: document.getElementById('auto-scroll-toggle'),
            voiceResponseToggle: document.getElementById('voice-response-toggle'),
            settingsModal: document.getElementById('settings-modal'),
            closeSettings: document.getElementById('close-settings'),
            rightPanel: document.getElementById('right-panel'),
            panelTitle: document.getElementById('panel-title'),
            panelContent: document.getElementById('panel-content'),
            closePanel: document.getElementById('close-panel'),
            chatList: document.getElementById('chat-list'),
            modeBtns: document.querySelectorAll('.mode-btn'),
            actionBtns: document.querySelectorAll('.action-btn')
        };
    }

    bindEvents() {
        // Input handling
        this.elements.messageInput.addEventListener('input', () => this.handleInput());
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
        this.elements.fileBtn.addEventListener('click', () => this.elements.fileUpload.click());
        this.elements.imageGenBtn.addEventListener('click', () => this.openImageGenerator());
        this.elements.mobileMenuBtn.addEventListener('click', () => this.toggleSidebar());
        
        // Settings
        this.elements.darkModeToggle.addEventListener('change', (e) => 
            this.updateSetting('theme', e.target.checked ? 'dark' : 'light'));
        this.elements.autoScrollToggle.addEventListener('change', (e) => 
            this.updateSetting('autoScroll', e.target.checked));
        this.elements.voiceResponseToggle.addEventListener('change', (e) => 
            this.updateSetting('voiceResponses', e.target.checked));
        this.elements.languageSelect.addEventListener('change', (e) => 
            this.updateSetting('language', e.target.value));
        this.elements.closeSettings.addEventListener('click', () => this.closeSettings());
        
        // Modes
        this.elements.modeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.setMode(btn.dataset.mode);
                this.elements.modeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Quick actions
        this.elements.actionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.elements.messageInput.value = btn.dataset.prompt;
                this.handleInput();
                this.elements.messageInput.focus();
            });
        });

        // File upload
        document.getElementById('file-upload').addEventListener('change', (e) => 
            this.handleFileUpload(e));

        // Panels
        this.elements.closePanel.addEventListener('click', () => this.closeRightPanel());

        // Global events
        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener('beforeinstallprompt', (e) => this.handleInstallPrompt(e));
        window.addEventListener('appinstalled', () => this.elements.installBtn?.classList.add('hidden'));
        document.addEventListener('click', (e) => {
            if (e.target === this.elements.settingsModal) this.closeSettings();
        });
    }

    async sendMessage() {
        const message = this.elements.messageInput.value.trim();
        if (!message || this.isTyping) return;

        this.addMessage(message, 'user');
        this.elements.messageInput.value = '';
        this.handleInput();

        this.showTypingIndicator();
        this.isTyping = true;
        this.elements.loadingOverlay.classList.remove('hidden');

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    chatId: this.currentChatId,
                    mode: this.currentMode,
                    language: this.settings.language
                })
            });

            if (!response.ok) throw new Error('API request failed');

            const data = await response.json();
            this.hideTypingIndicator();
            this.addMessage(data.response, 'ai');
            
            if (this.settings.voiceResponses) {
                setTimeout(() => this.speakText(data.response), 500);
            }
        } catch (error) {
            console.error('Chat error:', error);
            this.hideTypingIndicator();
            this.addMessage('Sorry, I encountered an error. Please try again. 😔', 'ai');
        } finally {
            this.isTyping = false;
            this.elements.loadingOverlay.classList.add('hidden');
            this.saveCurrentChat();
        }
    }

    async handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = e.target.result.split(',')[1];
            this.addMessage(`📎 Uploading: ${file.name}`, 'user');
            
            try {
                const response = await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: `Analyze this ${file.type.includes('image') ? 'image' : 'file'}:`,
                        file: { name: file.name, data: base64, type: file.type },
                        chatId: this.currentChatId,
                        mode: this.currentMode
                    })
                });
                const data = await response.json();
                this.addMessage(data.response, 'ai');
            } catch (error) {
                this.addMessage('File analysis failed. Please try again.', 'ai');
            }
        };

        if (file.type.startsWith('image/')) {
            reader.readAsDataURL(file);
        } else {
            reader.readAsText(file);
        }
    }

    addMessage(content, sender, options = {}) {
        const messageId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        messageDiv.dataset.messageId = messageId;
        messageDiv.innerHTML = `
            <div class="message-avatar">${sender === 'user' ? '👤' : '🤖'}</div>
            <div class="message-content">
                <div class="message-text">${this.renderMarkdown(content)}</div>
                <div class="message-time">${this.formatTime()}</div>
                <div class="message-actions">
                    <button class="action-btn-small copy-btn" data-id="${messageId}" title="Copy">📋</button>
                    ${sender === 'ai' ? `<button class="action-btn-small voice-btn" data-id="${messageId}" title="Listen">🔊</button>` : ''}
                </div>
            </div>
        `;

        this.elements.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
        this.showChatArea();

        // Bind action buttons
        messageDiv.querySelectorAll('.action-btn-small').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleMessageAction(e));
        });
    }

    renderMarkdown(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/^ {4}(.*)/gm, '<pre><code>$1</code></pre>')
            .replace(/^\>(.*)/gm, '<blockquote>$1</blockquote>')
            .replace(/\n/g, '<br>');
    }

    handleMessageAction(e) {
        const btn = e.target;
        const messageId = btn.dataset.id;
        const messageEl = document.querySelector(`[data-message-id="${messageId}"] .message-text`);
        const text = messageEl.textContent;

        if (btn.classList.contains('copy-btn')) {
            navigator.clipboard.writeText(text).then(() => {
                btn.textContent = '✓';
                btn.style.background = 'rgba(16,185,129,0.3)';
                setTimeout(() => {
                    btn.textContent = '📋';
                    btn.style.background = '';
                }, 1500);
            });
        } else if (btn.classList.contains('voice-btn')) {
            this.speakText(text);
        }
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ai typing-indicator';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <div class="typing-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        this.elements.messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    }

    openImageGenerator() {
        this.elements.panelTitle.textContent = '🖼️ AI Image Generator';
        this.elements.panelContent.innerHTML = `
            <div style="margin-bottom: 1.5rem;">
                <textarea id="image-prompt" rows="4" placeholder="Describe the image you want to generate..." 
                    style="width: 100%; padding: 1rem; border: 1px solid var(--glass-border); border-radius: 12px; background: var(--glass-bg); color: var(--text-primary); resize: vertical;"></textarea>
                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <button id="generate-image" class="btn-primary" style="flex: 1;">Generate Image</button>
                    <button id="image-history" class="tool-btn" style="padding: 1rem;">📸 History</button>
                </div>
            </div>
            <div id="image-results" class="image-grid"></div>
        `;

        document.getElementById('generate-image').addEventListener('click', () => 
            this.generateImage());
        
        this.elements.rightPanel.classList.remove('hidden');
        this.elements.rightPanel.classList.add('open');
    }

    async generateImage() {
        const prompt = document.getElementById('image-prompt').value.trim();
        if (!prompt) return;

        const resultsDiv = document.getElementById('image-results');
        resultsDiv.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Generating...</p>';

        try {
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            const data = await response.json();
            
            resultsDiv.innerHTML = data.images.map(img => `
                <img src="${img}" alt="Generated image" class="generated-image" 
                     onclick="window.open(this.src)" style="cursor: pointer;">
            `).join('');
        } catch (error) {
            resultsDiv.innerHTML = '<p style="color: #f87171;">Image generation failed. Please try again.</p>';
        }
    }

    setMode(mode) {
        this.currentMode = mode;
        // Update UI based on mode
        if (mode === 'image') this.openImageGenerator();
    }

    toggleSidebar() {
        this.elements.sidebar.classList.toggle('open');
    }

    closeRightPanel() {
        this.elements.rightPanel.classList.remove('open');
    }

    handleInput() {
        const hasText = this.elements.messageInput.value.trim().length > 0;
        this.elements.sendBtn.disabled = !hasText || this.isTyping;
        this.autoResizeTextarea();
    }

    autoResizeTextarea() {
        this.elements.messageInput.style.height = 'auto';
        this.elements.messageInput.style.height = Math.min(
            this.elements.messageInput.scrollHeight, 140
        ) + 'px';
    }

    newChat() {
        this.currentChatId = 'chat_' + Date.now();
        this.chats[this.currentChatId] = [];
        this.elements.messagesContainer.innerHTML = '';
        this.elements.welcomeScreen.classList.remove('hidden');
        this.elements.messagesContainer.classList.add('hidden');
        this.saveChats();
        this.updateChatHistory();
    }

    loadCurrentChat() {
        const chat = this.chats[this.currentChatId] || [];
        this.elements.messagesContainer.innerHTML = '';
        
        chat.forEach(msg => this.addMessage(msg.content, msg.sender));
        if (chat.length > 0) this.showChatArea();
    }

    saveCurrentChat() {
        const messages = Array.from(this.elements.messagesContainer.querySelectorAll('.message')).map(msg => {
            const textEl = msg.querySelector('.message-text');
            const sender = msg.classList.contains('user') ? 'user' : 'ai';
            return {
                content: textEl.textContent,
                sender,
                timestamp: Date.now()
            };
        });
        this.chats[this.currentChatId] = messages;
        this.saveChats();
    }

    saveChats() {
        localStorage.setItem('harshai-chats', JSON.stringify(this.chats));
        this.updateChatHistory();
    }

    updateChatHistory() {
        const chatList = this.elements.chatList;
        chatList.innerHTML = Object.entries(this.chats)
            .sort(([a], [b]) => parseInt(b.split('_')[1]) - parseInt(a.split('_')[1]))
            .map(([chatId, messages]) => {
                const lastMsg = messages[messages.length - 1];
                const preview = lastMsg ? 
                    (lastMsg.content.length > 50 ? 
                     lastMsg.content.substring(0, 50) + '...' : lastMsg.content) : 
                    'New conversation...';
                return `
                    <div class="chat-item ${chatId === this.currentChatId ? 'active' : ''}" 
                         data-chat-id="${chatId}">
                        <span class="chat-icon">💬</span>
                        <div class="chat-info">
                            <div class="chat-title">${chatId.split('_')[1].slice(-6)}</div>
                            <div class="chat-preview">${preview}</div>
                        </div>
                    </div>
                `;
            }).join('');

        // Bind chat selection
        chatList.querySelectorAll('.chat-item').forEach(item => {
            item.addEventListener('click', () => {
                this.currentChatId = item.dataset.chatId;
                this.loadCurrentChat();
                this.updateChatHistory();
                if (window.innerWidth < 768) this.elements.sidebar.classList.remove('open');
            });
        });
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

    formatTime() {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    speakText(text) {
        if (!this.settings.voiceResponses || !this.synth) return;
        this.synth.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1;
        utterance.volume = 0.85;
        utterance.lang = this.settings.language;
        this.synth.speak(utterance);
    }

    async toggleVoiceInput() {
        if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
            this.addMessage('Voice input not supported in this browser.', 'ai');
            return;
        }

        if (this.voiceRecognition) {
            this.stopVoiceInput();
        } else {
            this.startVoiceInput();
        }
    }

    startVoiceInput() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.voiceRecognition = new SpeechRecognition();
        this.voiceRecognition.continuous = false;
        this.voiceRecognition.interimResults = false;
        this.voiceRecognition.lang = this.settings.language === 'hi' ? 'hi-IN' : 'en-US';

        this.voiceRecognition.onstart = () => {
            this.elements.voiceBtn.classList.add('listening');
            this.elements.loadingText.textContent = 'Listening...';
        };

        this.voiceRecognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.elements.messageInput.value = transcript;
            this.handleInput();
        };

        this.voiceRecognition.onend = () => this.stopVoiceInput();

        this.voiceRecognition.start();
    }

    stopVoiceInput() {
        if (this.voiceRecognition) {
            this.voiceRecognition.stop();
            this.voiceRecognition = null;
        }
        this.elements.voiceBtn.classList.remove('listening');
        this.elements.loadingText.textContent = 'AI is thinking...';
    }

    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.settings.theme);
        this.elements.darkModeToggle.checked = this.settings.theme === 'dark';
    }

    updateSetting(key, value) {
        this.settings[key] = value;
        localStorage.setItem('harshai-settings', JSON.stringify(this.settings));
        
        if (key === 'theme') this.applyTheme();
        if (key === 'language') this.elements.languageSelect.value = value;
    }

    closeSettings() {
        this.elements.settingsModal.classList.add('hidden');
    }

    initPWA() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.installPrompt = e;
        });
    }

    handleInstallPrompt(e) {
        // PWA install handled automatically
    }

    initServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js');
        }
    }

    updateConnectionStatus() {
        const isOnline = navigator.onLine;
        this.elements.connectionStatus.textContent = isOnline ? '🟢 Online' : '🔴 Offline';
        this.elements.connectionStatus.className = isOnline ? 'status-online' : 'status-offline';
    }

    handleResize() {
        if (window.innerWidth >= 768) {
            this.elements.sidebar.classList.remove('open');
        }
    }

    clearAllChats() {
        if (confirm('Clear all chat history? This cannot be undone.')) {
            this.chats = {};
            localStorage.removeItem('harshai-chats');
            this.newChat();
        }
    }

    hideSplash() {
        setTimeout(() => {
            document.getElementById('splash-screen').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('splash-screen').remove();
                this.elements.appContainer.classList.remove('hidden');
            }, 400);
        }, 2500);
    }
}

// Global app instance
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new HarshAIApp();
});
window.app = app;