class ChatStorage {
    constructor() {
        this.storageKey = 'chrome_ai_chat_conversations';
        this.maxStoredConversations = 20; // Limit storage to prevent bloat
    }
    
    // Get all stored conversations
    getAllConversations() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error reading chat storage:', error);
            return {};
        }
    }
    
    // Save a conversation
    saveConversation(conversationId, messages, title = null) {
        try {
            const conversations = this.getAllConversations();
            
            // Auto-generate title from first user message if not provided
            if (!title) {
                const firstUserMsg = messages.find(msg => msg.role === 'user');
                title = firstUserMsg ? 
                    firstUserMsg.content.substring(0, 50) + (firstUserMsg.content.length > 50 ? '...' : '') :
                    'New Conversation';
            }
            
            conversations[conversationId] = {
                id: conversationId,
                title: title,
                messages: messages,
                timestamp: Date.now(),
                lastUpdated: Date.now()
            };
            
            // Clean up old conversations if we exceed the limit
            this.cleanupOldConversations(conversations);
            
            localStorage.setItem(this.storageKey, JSON.stringify(conversations));
            return true;
        } catch (error) {
            console.error('Error saving conversation:', error);
            return false;
        }
    }
    
    // Load a conversation
    loadConversation(conversationId) {
        try {
            const conversations = this.getAllConversations();
            return conversations[conversationId] || null;
        } catch (error) {
            console.error('Error loading conversation:', error);
            return null;
        }
    }
    
    // Delete a conversation
    deleteConversation(conversationId) {
        try {
            const conversations = this.getAllConversations();
            delete conversations[conversationId];
            localStorage.setItem(this.storageKey, JSON.stringify(conversations));
            return true;
        } catch (error) {
            console.error('Error deleting conversation:', error);
            return false;
        }
    }
    
    // Get conversation list for UI (sorted by last updated)
    getConversationList() {
        try {
            const conversations = this.getAllConversations();
            return Object.values(conversations)
                .sort((a, b) => b.lastUpdated - a.lastUpdated)
                .map(conv => ({
                    id: conv.id,
                    title: conv.title,
                    timestamp: conv.timestamp,
                    lastUpdated: conv.lastUpdated,
                    messageCount: conv.messages.length
                }));
        } catch (error) {
            console.error('Error getting conversation list:', error);
            return [];
        }
    }
    
    // Clean up old conversations to prevent storage bloat
    cleanupOldConversations(conversations) {
        const conversationArray = Object.values(conversations);
        if (conversationArray.length > this.maxStoredConversations) {
            // Sort by last updated and keep only the most recent ones
            const sorted = conversationArray.sort((a, b) => b.lastUpdated - a.lastUpdated);
            const toKeep = sorted.slice(0, this.maxStoredConversations);
            
            // Rebuild conversations object with only the ones we're keeping
            const newConversations = {};
            toKeep.forEach(conv => {
                newConversations[conv.id] = conv;
            });
            
            // Update the passed object reference
            Object.keys(conversations).forEach(key => {
                if (!newConversations[key]) {
                    delete conversations[key];
                }
            });
        }
    }
    
    // Update conversation title
    updateConversationTitle(conversationId, newTitle) {
        try {
            const conversations = this.getAllConversations();
            if (conversations[conversationId]) {
                conversations[conversationId].title = newTitle;
                conversations[conversationId].lastUpdated = Date.now();
                localStorage.setItem(this.storageKey, JSON.stringify(conversations));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating conversation title:', error);
            return false;
        }
    }
    
    // Generate unique conversation ID
    generateConversationId() {
        return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

class ChromeAIChat {
    constructor() {
        this.session = null;
        this.isInitialized = false;
        this.isProcessing = false;
        this.currentConversationId = null;
        this.currentMessages = []; // Track current conversation messages
        
        this.elements = {
            status: document.getElementById('status'),
            progressBar: document.getElementById('progressBar'),
            progressFill: document.getElementById('progressFill'),
            usageInfo: document.getElementById('usageInfo'),
            chatMessages: document.getElementById('chatMessages'),
            typingIndicator: document.getElementById('typingIndicator'),
            chatInput: document.getElementById('chatInput'),
            sendButton: document.getElementById('sendButton'),
            clearButton: document.getElementById('clearButton'),
            newSessionButton: document.getElementById('newSessionButton'),
            openInNewTabButton: document.getElementById('openInNewTabButton'),
            // New elements for chat history
            historyButton: document.getElementById('historyButton'),
            saveButton: document.getElementById('saveButton'),
            historyModal: document.getElementById('historyModal'),
            historyModalBackdrop: document.getElementById('historyModalBackdrop'),
            closeHistoryModal: document.getElementById('closeHistoryModal'),
            historyList: document.getElementById('historyList')
        };
        
        // Initialize chat storage
        this.chatStorage = new ChatStorage();
        
        // Ensure typingIndicator is part of chatMessages
        if (!this.elements.chatMessages.contains(this.elements.typingIndicator)) {
            this.elements.chatMessages.appendChild(this.elements.typingIndicator);
        }

        // Hide typing indicator until explicitly shown
        if (this.elements.typingIndicator) {
            this.elements.typingIndicator.classList.remove('active');
            this.elements.typingIndicator.style.display = 'none';
        }

        this.init();
        this.bindEvents();
    }
    
    async init() {
        try {
            // Check if the API is available in extension context
            if (typeof LanguageModel === 'undefined') {
                throw new Error('Chrome AI API not available. Make sure you have Chrome 138+ and proper hardware.');
            }
            
            this.updateStatus('loading', 'Setting up chat...');
            this.addMessage('system', 'Please wait while setting up the chat. This may take a moment on first use.');
            
            // Check model availability
            const availability = await LanguageModel.availability();
            console.log('Model availability:', availability);
            
            if (availability === 'unavailable') {
                throw new Error('AI model not available on this device');
            }
            
            if (availability === 'downloadable') {
                this.updateStatus('loading', 'Downloading model...');
                this.elements.progressBar.style.display = 'block';
                // Update the system message to show download status
                const messages = this.elements.chatMessages.querySelectorAll('.message.system');
                if (messages.length > 0) {
                    messages[messages.length - 1].innerHTML = '⏳ Downloading AI model... This may take a few minutes on first use. Please wait while we set up your chat.';
                }
            }
            
            await this.createSession();
            
            this.isInitialized = true;
            this.updateStatus('ready', 'Ready');
            this.enableInput();
            this.elements.progressBar.style.display = 'none';
            
            // Clear the setup message and show ready message
            const messages = this.elements.chatMessages.querySelectorAll('.message.system');
            if (messages.length > 0) {
                messages[messages.length - 1].innerHTML = '🎉 AI is ready! You can now start chatting. This AI runs locally on your device for complete privacy.';
            }
            
        } catch (error) {
            console.error('Initialization error:', error);
            this.updateStatus('error', 'Error: ' + error.message);
            this.addMessage('system', `Error: ${error.message}`);
        }
    }
    
    async createSession() {
        try {
            this.session = await LanguageModel.create({
                initialPrompts: [
                    {
                        role: 'system',
                        content: 'You are a helpful and friendly assistant. Keep responses conversational and concise.'
                    }
                ],
                monitor: (monitor) => {
                    monitor.addEventListener('downloadprogress', (e) => {
                        const progress = Math.round(e.loaded * 100);
                        this.elements.progressFill.style.width = progress + '%';
                        this.updateStatus('loading', `Downloading... ${progress}%`);
                        // Update the system message with progress
                        const messages = this.elements.chatMessages.querySelectorAll('.message.system');
                        if (messages.length > 0) {
                            messages[messages.length - 1].innerHTML = `⏳ Downloading AI model... ${progress}% complete. Please wait while we set up your chat.`;
                        }
                    });
                }
            });
            
            this.updateUsageInfo();
        } catch (error) {
            throw new Error('Failed to create AI session: ' + error.message);
        }
    }
    
    bindEvents() {
        this.elements.sendButton.addEventListener('click', () => this.sendMessage());
        this.elements.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        this.elements.chatInput.addEventListener('input', () => {
            this.autoResize();
        });
        
        this.elements.clearButton.addEventListener('click', () => this.clearChat());
        this.elements.newSessionButton.addEventListener('click', () => this.createNewSession());
        
        // New event handlers for chat history
        this.elements.historyButton.addEventListener('click', () => this.showHistoryModal());
        this.elements.saveButton.addEventListener('click', () => this.saveCurrentConversationManually());
        this.elements.closeHistoryModal.addEventListener('click', () => this.hideHistoryModal());
        this.elements.historyModalBackdrop.addEventListener('click', () => this.hideHistoryModal());
        
        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.historyModal.classList.contains('show')) {
                this.hideHistoryModal();
            }
        });
        
        if (this.elements.openInNewTabButton) {
            this.elements.openInNewTabButton.addEventListener('click', () => {
                window.open('full_chat.html', '_blank'); // Open the full-screen chat in a new tab
            });
        }
    }
    
    autoResize() {
        const textarea = this.elements.chatInput;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 80) + 'px';
    }
    
    async sendMessage() {
        if (!this.isInitialized || this.isProcessing || !this.elements.chatInput.value.trim()) {
            return;
        }

        const message = this.elements.chatInput.value.trim();
        this.elements.chatInput.value = '';
        this.autoResize();

        this.addMessage('user', message);
        this.showTypingIndicator();
        this.setProcessing(true);

        try {
                            // Use streaming for better user experience
            const stream = this.session.promptStreaming(message);

            // create assistant message and mark as streaming (visual shimmer)
            const messageElement = this.addMessage('assistant', '');
            if (messageElement) {
                messageElement.classList.add('streaming');
                messageElement.setAttribute('aria-busy', 'true');
                messageElement.setAttribute('aria-live', 'polite');
            }

            let response = '';
            let chunkCount = 0;
            for await (const chunk of stream) {
                // accumulate raw markdown text, render progressively
                response += chunk;
                chunkCount++;
                if (messageElement) {
                    messageElement.innerHTML = this.renderMarkdown(response);
                    
                    // More aggressive scrolling during streaming to prevent cut-off
                    if (chunkCount <= 5) {
                        // Scroll on every chunk for first few chunks to establish position
                        this.scrollToBottom();
                    } else if (chunkCount % 2 === 0) {
                        // Scroll every other chunk after initial chunks
                        this.scrollToBottom();
                    }
                    
                    // Check if user has scrolled up and only auto-scroll if they're near bottom
                    const el = this.elements.chatMessages;
                    const isNearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 50;
                    if (!isNearBottom && chunkCount > 10) {
                        // If user scrolled up, reduce auto-scroll frequency
                        if (chunkCount % 5 === 0) {
                            this.scrollToBottom();
                        }
                    }
                }
            }

            // remove streaming visual when done
            if (messageElement) {
                messageElement.classList.remove('streaming');
                messageElement.removeAttribute('aria-busy');
            }
            this.updateUsageInfo();
            
            // Final scroll to ensure all content is visible
            setTimeout(() => this.scrollToBottom(), 100);

        } catch (error) {
            console.error('Chat error:', error);
            this.addMessage('system', 'Error: ' + error.message);
        } finally {
            this.hideTypingIndicator();
            this.setProcessing(false);
        }
    }
    
    addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;

        // render markdown to HTML (safe-escaped)
        messageDiv.innerHTML = this.renderMarkdown(content || '');

        this.elements.chatMessages.insertBefore(messageDiv, this.elements.typingIndicator);
        
        // Track message in current conversation (skip system messages for conversation history)
        if (role !== 'system') {
            this.currentMessages.push({
                role: role,
                content: content || '',
                timestamp: Date.now()
            });
            
            // Auto-save conversation after each assistant response (when we have a conversation going)
            if (role === 'assistant' && this.currentMessages.length > 1) {
                // Generate conversation ID if we don't have one yet
                if (!this.currentConversationId) {
                    this.currentConversationId = this.chatStorage.generateConversationId();
                }
                this.saveCurrentConversation();
            }
        }
        
        // Ensure proper scrolling after adding message
        requestAnimationFrame(() => {
            this.scrollToBottom();
        });

        return messageDiv;
    }
    
    // Save current conversation to storage
    saveCurrentConversation() {
        if (!this.currentConversationId) {
            this.currentConversationId = this.chatStorage.generateConversationId();
        }
        
        if (this.currentMessages.length > 0) {
            this.chatStorage.saveConversation(this.currentConversationId, this.currentMessages);
        }
    }
    
    // Load a conversation from storage
    loadConversation(conversationId) {
        const conversation = this.chatStorage.loadConversation(conversationId);
        if (!conversation) return false;
        
        // Clear current chat
        this.clearChatUI();
        
        // Load messages
        this.currentConversationId = conversationId;
        this.currentMessages = [...conversation.messages]; // Copy the array
        
        // Display messages
        conversation.messages.forEach(msg => {
            this.addMessageToUI(msg.role, msg.content);
        });
        
        this.addMessage('system', `Loaded conversation: "${conversation.title}"`);
        this.scrollToBottom();
        
        return true;
    }
    
    // Add message to UI without affecting currentMessages tracking
    addMessageToUI(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        messageDiv.innerHTML = this.renderMarkdown(content || '');
        this.elements.chatMessages.insertBefore(messageDiv, this.elements.typingIndicator);
    }
    
    // Clear chat UI only (doesn't affect storage)
    clearChatUI() {
        const messages = this.elements.chatMessages.querySelectorAll('.message:not(.system)');
        messages.forEach(msg => msg.remove());
    }
    
    // Start a new conversation
    startNewConversation() {
        // Save current conversation if it has messages
        if (this.currentMessages.length > 0) {
            this.saveCurrentConversation();
        }
        
        // Reset conversation state
        this.currentConversationId = null;
        this.currentMessages = [];
        
        // Clear UI
        this.clearChatUI();
    }
    
    showTypingIndicator() {
        if (!this.elements.typingIndicator) return;
        this.elements.typingIndicator.classList.add('active');
        this.elements.typingIndicator.style.display = 'flex';
        this.elements.typingIndicator.setAttribute('aria-hidden', 'false');
        this.scrollToBottom();
    }
    
    hideTypingIndicator() {
        if (!this.elements.typingIndicator) return;
        this.elements.typingIndicator.classList.remove('active');
        this.elements.typingIndicator.style.display = 'none';
        this.elements.typingIndicator.setAttribute('aria-hidden', 'true');
    }
    
    scrollToBottom() {
        // ensure chatMessages exists
        const el = this.elements && this.elements.chatMessages;
        if (!el) return;
        
        // Use multiple approaches to ensure reliable scrolling during streaming
        const scrollToEnd = () => {
            const currentScrollHeight = el.scrollHeight;
            const currentScrollTop = el.scrollTop;
            const currentClientHeight = el.clientHeight;
            
            // Force immediate scroll to bottom
            el.scrollTop = currentScrollHeight;
            
            // Double-check and force again if needed (handles race conditions during streaming)
            if (el.scrollTop < currentScrollHeight - currentClientHeight - 10) {
                // Use scrollIntoView as backup for stubborn cases
                const lastMessage = el.lastElementChild;
                if (lastMessage && lastMessage.scrollIntoView) {
                    lastMessage.scrollIntoView({ behavior: 'instant', block: 'end' });
                }
                // Force scroll position one more time
                el.scrollTop = el.scrollHeight;
            }
        };
        
        // Execute immediately and then double-check after next frame
        scrollToEnd();
        requestAnimationFrame(() => {
            scrollToEnd();
            // Final check after a brief delay for content that might still be rendering
            setTimeout(scrollToEnd, 16); // One more frame
        });
    }
    
    updateStatus(type, text) {
        this.elements.status.className = `status ${type}`;
        this.elements.status.textContent = text;
    }
    
    updateUsageInfo() {
        if (this.session && this.session.inputUsage !== undefined && this.session.inputQuota !== undefined) {
            const usage = `${this.session.inputUsage}/${this.session.inputQuota} tokens`;
            this.elements.usageInfo.textContent = usage;
            this.elements.usageInfo.setAttribute('aria-label', `Token usage: ${usage}`);
        }
    }
    
    enableInput() {
        this.elements.chatInput.disabled = false;
        this.elements.sendButton.disabled = false;
        this.elements.chatInput.focus();
    }
    
    setProcessing(processing) {
        this.isProcessing = processing;
        this.elements.sendButton.disabled = processing || !this.isInitialized;
        this.elements.chatInput.disabled = processing;
        
        if (!processing && this.isInitialized) {
            this.elements.chatInput.focus();
        }
    }
    
    clearChat() {
        // Save current conversation before clearing
        if (this.currentMessages.length > 0) {
            this.saveCurrentConversation();
        }
        
        this.clearChatUI();
        
        // Reset conversation tracking but don't start new conversation yet
        this.currentMessages = [];
        
        this.addMessage('system', 'Chat cleared. Previous context has been preserved. Conversation saved to history.');
    }
    
    async createNewSession() {
        if (this.isProcessing) return;
        
        try {
            this.updateStatus('loading', 'Creating new session...');
            this.setProcessing(true);
            
            // Save current conversation before starting new session
            if (this.currentMessages.length > 0) {
                this.saveCurrentConversation();
            }
            
            if (this.session) {
                this.session.destroy();
            }
            
            await this.createSession();
            
            // Start a completely new conversation
            this.startNewConversation();
            
            this.addMessage('system', 'New session created. Previous conversation has been saved to history.');
            this.updateStatus('ready', 'Ready');
            
        } catch (error) {
            console.error('New session error:', error);
            this.addMessage('system', 'Error creating new session: ' + error.message);
            this.updateStatus('error', 'Error');
        } finally {
            this.setProcessing(false);
        }
    }
    
    // History Modal Management
    showHistoryModal() {
        this.refreshHistoryList();
        this.elements.historyModal.classList.add('show');
        this.elements.historyModal.setAttribute('aria-hidden', 'false');
        // Focus management
        this.elements.closeHistoryModal.focus();
    }
    
    hideHistoryModal() {
        this.elements.historyModal.classList.remove('show');
        this.elements.historyModal.setAttribute('aria-hidden', 'true');
    }
    
    refreshHistoryList() {
        const conversations = this.chatStorage.getConversationList();
        const historyList = this.elements.historyList;
        
        if (conversations.length === 0) {
            historyList.innerHTML = `
                <div class="history-empty">
                    <p>No saved conversations yet.</p>
                    <p class="text-muted">Your conversations will be automatically saved as you chat.</p>
                </div>
            `;
            return;
        }
        
        historyList.innerHTML = conversations.map(conv => {
            const date = new Date(conv.timestamp);
            const timeAgo = this.getTimeAgo(conv.lastUpdated);
            
            return `
                <div class="history-item" data-conversation-id="${conv.id}">
                    <div class="history-item-title">${this.escapeHtml(conv.title)}</div>
                    <div class="history-item-meta">
                        <span>${conv.messageCount} messages</span>
                        <span>${timeAgo}</span>
                    </div>
                    <div class="history-item-actions">
                        <button class="history-action-btn load" data-action="load" data-id="${conv.id}">
                            📖 Load
                        </button>
                        <button class="history-action-btn delete" data-action="delete" data-id="${conv.id}">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add event listeners to action buttons
        historyList.addEventListener('click', (e) => {
            const action = e.target.getAttribute('data-action');
            const conversationId = e.target.getAttribute('data-id');
            
            if (action === 'load') {
                this.loadConversationFromHistory(conversationId);
            } else if (action === 'delete') {
                this.deleteConversationFromHistory(conversationId);
            }
        });
    }
    
    loadConversationFromHistory(conversationId) {
        const success = this.loadConversation(conversationId);
        if (success) {
            this.hideHistoryModal();
        }
    }
    
    deleteConversationFromHistory(conversationId) {
        if (confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
            const success = this.chatStorage.deleteConversation(conversationId);
            if (success) {
                this.refreshHistoryList();
                // If we deleted the current conversation, reset current conversation ID
                if (this.currentConversationId === conversationId) {
                    this.currentConversationId = null;
                }
            }
        }
    }
    
    saveCurrentConversationManually() {
        if (this.currentMessages.length === 0) {
            this.addMessage('system', 'No messages to save. Start a conversation first!');
            return;
        }
        
        // Prompt for custom title
        const customTitle = prompt('Enter a title for this conversation:', 
            this.currentMessages.find(msg => msg.role === 'user')?.content.substring(0, 50) + '...' || 'Untitled Conversation');
        
        if (customTitle !== null) { // User didn't cancel
            if (!this.currentConversationId) {
                this.currentConversationId = this.chatStorage.generateConversationId();
            }
            
            const success = this.chatStorage.saveConversation(this.currentConversationId, this.currentMessages, customTitle);
            if (success) {
                this.addMessage('system', `Conversation saved as: "${customTitle}"`);
            } else {
                this.addMessage('system', 'Error saving conversation. Please try again.');
            }
        }
    }
    
    // Utility function to display time ago
    getTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return new Date(timestamp).toLocaleDateString();
    }
    
    // Basic, safe markdown renderer (supports code blocks, inline code, links, headings, bold, italics, lists, line breaks)
    renderMarkdown(md) {
        if (!md) return '';

        // escape HTML first
        let s = this.escapeHtml(md);

        // extract fenced code blocks to placeholders
        const codeBlocks = [];
        s = s.replace(/```([\s\S]*?)```/g, (m, p1) => {
            codeBlocks.push(p1);
            return `@@CODEBLOCK${codeBlocks.length - 1}@@`;
        });

        // inline code
        s = s.replace(/`([^`]+)`/g, '<code>$1</code>');

        // links [text](url)
        s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, text, url) => {
            const safeUrl = this.escapeHtml(url);
            return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${text}</a>`;
        });

        // headings
        s = s.replace(/^######\s*(.*)$/gm, '<h6>$1</h6>');
        s = s.replace(/^#####\s*(.*)$/gm, '<h5>$1</h5>');
        s = s.replace(/^####\s*(.*)$/gm, '<h4>$1</h4>');
        s = s.replace(/^###\s*(.*)$/gm, '<h3>$1</h3>');
        s = s.replace(/^##\s*(.*)$/gm, '<h2>$1</h2>');
        s = s.replace(/^#\s*(.*)$/gm, '<h1>$1</h1>');

        // bold then italic
        s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
        s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        s = s.replace(/_([^_]+)_/g, '<em>$1</em>');

        // simple list handling: group contiguous lines starting with "- "
        const lines = s.split('\n');
        let out = [];
        let inList = false;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (/^\s*[-*]\s+/.test(line)) {
                if (!inList) {
                    inList = true;
                    out.push('<ul>');
                }
                out.push('<li>' + line.replace(/^\s*[-*]\s+/, '') + '</li>');
            } else {
                if (inList) {
                    inList = false;
                    out.push('</ul>');
                }
                out.push(line);
            }
        }
        if (inList) out.push('</ul>');
        s = out.join('\n');

        // convert remaining single newlines to <br>
        s = s.replace(/\n/g, '<br>');

        // restore code blocks safely (they were escaped earlier)
        s = s.replace(/@@CODEBLOCK(\d+)@@/g, (m, idx) => {
            const code = codeBlocks[Number(idx)] || '';
            return `<pre><code>${code}</code></pre>`;
        });

        return s;
    }

    escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

// Initialize the chat when the popup loads
document.addEventListener('DOMContentLoaded', () => {
    new ChromeAIChat();
});