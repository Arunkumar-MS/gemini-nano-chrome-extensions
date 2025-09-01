# 🤖 Chrome AI Chat Extension

A powerful Chrome extension that brings Google's **Gemini Nano AI** directly to your browser for completely **private, offline AI conversations**. No data leaves your device - everything runs locally using Chrome's built-in AI capabilities.

![Chrome AI Chat Extension](https://img.shields.io/badge/Chrome-Extension-blue?style=for-the-badge&logo=googlechrome)
![AI Model](https://img.shields.io/badge/AI-Gemini%20Nano-green?style=for-the-badge)
![Privacy](https://img.shields.io/badge/Privacy-100%25%20Local-red?style=for-the-badge)

## ✨ Features

### 🔒 **Complete Privacy**
- **100% Local Processing**: All AI conversations happen on your device
- **No Data Transmission**: Nothing is sent to external servers
- **Offline Capable**: Works without internet connection once AI model is downloaded

### 💬 **Rich Chat Experience**
- **Real-time Streaming**: See AI responses as they're generated
- **Markdown Support**: Formatted text, code blocks, lists, and links
- **Auto-scroll**: Smart scrolling that keeps content visible during streaming
- **Responsive Design**: Beautiful UI that works in both popup and fullscreen modes

### 📚 **Conversation Management**
- **Auto-save**: Conversations automatically saved as you chat
- **History Browser**: View and load previous conversations
- **Custom Titles**: Save conversations with personalized names
- **Smart Cleanup**: Automatically manages storage to prevent bloat (keeps 20 most recent)

### 🚀 **User Experience**
- **Fullscreen Mode**: Expandable chat interface for longer conversations
- **Keyboard Shortcuts**: Enter to send, Shift+Enter for new lines, ESC to close modals
- **Accessibility**: Full ARIA support and screen reader compatibility
- **Modern UI**: Glass-morphism design with smooth animations

## 📋 Requirements

### Browser Requirements
- **Chrome 138+** (Canary or Dev channel recommended)
- **Hardware**: Modern computer with sufficient RAM (8GB+ recommended)
- **Platform**: Windows, macOS, or Linux

### Enable Chrome AI Features
1. Open Chrome and go to `chrome://flags/`
2. Enable the following flags:
   - `#optimization-guide-on-device-model` → **Enabled**
   - `#prompt-api-for-gemini-nano` → **Enabled**
   - `#summarization-api-for-gemini-nano` → **Enabled**
3. Restart Chrome

## 🔧 Installation Steps

### Method 1: Load as Unpacked Extension (Recommended for Development)

1. **Download the Extension**
   ```bash
   git clone https://github.com/Arunkumar-MS/chrome-ai-chat-extension.git
   cd chrome-ai-chat-extension
   ```

2. **Open Chrome Extension Management**
   - Go to `chrome://extensions/`
   - Enable **"Developer mode"** (toggle in top right)

3. **Load the Extension**
   - Click **"Load unpacked"**
   - Select the `chrome-ai-chat-extension` folder
   - The extension will appear in your extensions list

4. **Pin to Toolbar** (Optional)
   - Click the extensions icon (puzzle piece) in Chrome toolbar
   - Pin the "Chrome AI Chat" extension for easy access

### Method 2: Manual Installation

1. **Download** the latest release ZIP file
2. **Extract** the contents to a folder
3. **Follow steps 2-4** from Method 1

## 🚀 Usage

### First Time Setup
1. **Click the extension icon** in your Chrome toolbar
2. **Wait for AI model download** (may take 5-15 minutes on first use)
   - The model (approx. 1.7GB) downloads automatically
   - A loading screen shows progress
3. **Start chatting** once "Ready" status appears

### Chat Features
- **Send Messages**: Type in the input field and press Enter
- **View History**: Click the 📚 History button to see saved conversations
- **Save Conversations**: Click the 💾 Save button to save with a custom title
- **Clear Chat**: Click 🗑️ Clear to reset current conversation
- **New Session**: Click ✨ New Session to start fresh with new AI context
- **Fullscreen**: Click 🚀 Full Screen for expanded chat interface

### Keyboard Shortcuts
- `Enter` - Send message
- `Shift + Enter` - New line in message
- `Escape` - Close modals/overlays

## 🏗️ Project Structure

```
chrome-ai-chat-extension/
├── manifest.json          # Extension manifest
├── popup.html             # Main chat interface (popup)
├── popup.css              # Popup styles
├── popup.js               # Main chat logic and AI integration
├── full_chat.html         # Fullscreen chat interface  
├── full_chat.css          # Fullscreen styles
├── overlay.js             # Loading overlay management
├── background.js          # Service worker
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # This file
```

## 🔧 Technical Details

### AI Integration
- **Model**: Google Gemini Nano (built into Chrome)
- **API**: Chrome's experimental Language Model API
- **Processing**: 100% on-device inference
- **Streaming**: Real-time response generation

### Storage
- **LocalStorage**: Conversation history and user preferences
- **Automatic Cleanup**: Maintains last 20 conversations
- **No External Storage**: All data stays on your device

### Security
- **Permissions**: Minimal required permissions
- **Privacy**: No network requests for AI processing
- **Data**: All conversations stored locally only

## 🛠️ Development

### Setup
```bash
git clone https://github.com/Arunkumar-MS/chrome-ai-chat-extension.git
cd chrome-ai-chat-extension
```

### File Editing
1. Make changes to HTML, CSS, or JavaScript files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension
4. Changes will be reflected immediately

### Debugging
- **Console**: Open DevTools on the extension popup/fullscreen
- **Background**: Inspect service worker in `chrome://extensions/`
- **Storage**: Check localStorage in DevTools → Application

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Known Issues

- **First Load**: Initial model download can take 10-15 minutes
- **Memory**: Requires sufficient RAM for AI model (8GB+ recommended)
- **Chrome Version**: Requires very recent Chrome versions with AI features

## 🔮 Future Features

- [ ] Export conversations to files
- [ ] Import/export conversation history
- [ ] Custom AI model parameters
- [ ] Voice input/output
- [ ] Multiple conversation threads
- [ ] Conversation search functionality

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Chrome Team** for Gemini Nano integration
- **Chrome Extensions Team** for the robust extension platform
- **Community Contributors** for feedback and improvements

## ⚠️ Disclaimer

This extension uses experimental Chrome AI features. Functionality may change as Chrome's AI capabilities evolve. The AI model and responses are generated by Google's Gemini Nano running locally on your device.

---

**Made with ❤️ for private, local AI conversations**

*If you find this extension useful, please give it a ⭐ and share with others!*