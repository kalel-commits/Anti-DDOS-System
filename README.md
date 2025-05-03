# Anti-DDOS System

A real-time DDoS attack detection and monitoring system with a modern web interface.

## Features

- Real-time DDoS attack detection
- Interactive attack timeline visualization
- Detailed attack event logging
- Attack type classification
- Confidence level assessment
- Device-based attack tracking
- Real-time updates using WebSocket

## Tech Stack

### Frontend
- React.js
- Material-UI
- Chart.js for visualizations
- Socket.IO client for real-time updates

### Backend
- Node.js
- Express.js
- Socket.IO
- SQLite for data persistence

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Python 3.x (for ML components)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/anti-ddos-system.git
cd anti-ddos-system
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Install backend dependencies:
```bash
cd ../backend
npm install
```

## Running the Application

1. Start the backend server:
```bash
cd backend
npm start
```

2. Start the frontend development server:
```bash
cd frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Project Structure

```
anti-ddos-system/
├── frontend/           # React frontend application
│   ├── src/           # Source files
│   └── public/        # Static files
├── backend/           # Node.js backend server
│   ├── models/        # Database models
│   └── routes/        # API routes
└── README.md         # Project documentation
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 