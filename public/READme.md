# HearHelper - Hearing Impairment Assistance Web Application

## Overview
HearHelper is a comprehensive web application designed to assist hearing-impaired individuals in their daily communication and emergency needs. The application provides real-time speech transcription, text-to-speech functionality, and emergency alert systems.

## Features

### 1. **Real-time Transcription**
- Convert spoken words to text in real-time
- Multi-language support
- Clear and interim transcript display
- Transcript history and saving

### 2. **Communication Assistant**
- Two-way communication interface
- Text and speech input
- Quick response phrases
- Adjustable font sizes and contrast

### 3. **Text-to-Speech**
- Natural-sounding audio output
- Customizable voice and speed settings
- Multiple language support

### 4. **Emergency Alert System**
- Quick access to emergency services (Ambulance, Police, Fire)
- Location sharing
- Visual and textual alerts
- Emergency message sending

### 5. **Accessibility Features**
- High contrast mode
- Large font support
- Keyboard navigation
- Screen reader compatible

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Speech APIs**: Web Speech API (Speech Recognition & Text-to-Speech)
- **Backend**: Node.js, Express.js (Optional)
- **Database**: Can integrate with Firebase, MongoDB, or SQL databases

## Installation

### Prerequisites
- Modern web browser (Chrome, Firefox, Edge, Safari)
- Node.js (for running server)
- npm or yarn

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ganeshthegod/hearing-aid-app.git
   cd hearing-aid-app
   ```

2. **Install dependencies (if using Node.js backend)**
   ```bash
   npm install
   ```

3. **Run the application**
   - **Without backend**: Open `index.html` in your browser
   - **With Firebase Local Server**: 
     ```bash
     firebase login
     firebase serve
     ```
     Then visit the URL provided in the terminal (usually `http://localhost:5000`)

## Usage

### Starting the Application
1. Open the application in your browser
2. Navigate to the desired feature from the navigation menu
3. For transcription, click "Start Listening" to begin recording
4. Use quick phrases for common responses
5. Access emergency features when needed

### Keyboard Shortcuts
- **Alt + S**: Start/Stop listening
- **Alt + M**: Mute/Unmute audio

## Project Structure

```
hearing-aid-app/
├── index.html              # Home page
├── css/
│   └── styles.css         # Main styling
├── js/
│   ├── main.js            # Main application logic
│   ├── speechRecognition.js # Speech-to-text module
│   ├── textToSpeech.js    # Text-to-speech module
│   └── utils.js           # Utility functions
├── pages/
│   ├── transcription.html # Real-time transcription
│   ├── community.html     # Communication assistant
│   ├── emergency.html     # Emergency alerts
│   └── settings.html      # User settings
├── server.js              # Node.js backend
└── README.md             # Documentation
```

## Browser Support

- Chrome 25+
- Firefox 47+
- Safari 14.1+
- Edge 79+

## Future Enhancements

- [ ] Machine learning for better transcription accuracy
- [ ] Integration with video calling platforms
- [ ] Mobile app version (React Native/Flutter)
- [ ] Cloud-based transcript storage
- [ ] Real emergency service integration
- [ ] Multi-user collaboration features
- [ ] Offline mode support
- [ ] Advanced analytics dashboard

## Accessibility Compliance

This application adheres to:
- WCAG 2.1 Level AA standards
- ADA compliance
- Section 508 compliance

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support & Feedback

For support or feedback, please contact:
- Email: support@hearhelper.com
- GitHub Issues: [Project Issues](https://github.com/Ganeshthegod/hearing-aid-app/issues)

## Author

**Ganeshthegod**
BCA Final Year Project - 2026

## Acknowledgments

- Web Speech API documentation
- Accessibility guidelines and best practices
- Hearing impairment community feedback
- All contributors and supporters

---

**Making communication accessible for everyone! 🎧**