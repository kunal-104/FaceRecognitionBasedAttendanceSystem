# Face Recognition Attendance System

## Project Overview
The Face Recognition Attendance System is a web-based application designed to automate the process of attendance tracking using face recognition technology. It leverages Node.js, Express, and pre-trained face recognition models to provide an efficient and user-friendly solution for managing student attendance.

---

## Features

### 1. **Student Management**
- Add, retrieve, and delete student records.
- Each student has attributes like name, roll number, and face descriptors.

### 2. **Subject Management**
- Add and retrieve subjects.
- Each subject has its own attendance file.

### 3. **Attendance Tracking**
- Mark attendance for students based on face recognition.
- Retrieve attendance records for specific subjects and dates.

### 4. **Data Storage**
- Stores data in CSV files for students, subjects, and attendance records.
- Attendance records are maintained per subject.

### 5. **Export Features**
- Export attendance records for a specific subject as a CSV file.
- Export all data (students, subjects, and attendance) as a ZIP file.

### 6. **Frontend Integration**
- Serves a frontend interface from the `public` directory.

### 7. **Face Recognition Models**
- Uses pre-trained models (e.g., `ssd_mobilenetv1`, `face_recognition_model`) stored in the `models` directory for face detection and recognition.

---

## Technical Details

### Backend
- **Framework**: Node.js with Express.js
- **Data Handling**: CSV files for persistent storage
- **APIs**:
  - `/api/students`: Manage student records
  - `/api/subjects`: Manage subject records
  - `/api/attendance`: Mark and retrieve attendance
  - `/api/export`: Export all data as a ZIP file

### Frontend
- **Static Files**: Served from the `public` directory
- **User Interface**: HTML, CSS, and JavaScript

### Face Recognition
- **Models Used**:
  - `ssd_mobilenetv1`: For face detection
  - `face_recognition_model`: For face recognition
- **Model Files**: Stored in the `models` directory

---

## How It Works
1. **Student Registration**:
   - Add students with their face descriptors.
   - Face descriptors are used for recognition.

2. **Subject Management**:
   - Add subjects to the system.
   - Each subject gets a dedicated attendance file.

3. **Mark Attendance**:
   - Recognize students' faces and mark them as present for a specific subject and date.

4. **Retrieve Attendance**:
   - View attendance records for a specific subject and date.

5. **Export Data**:
   - Download attendance records or all data as CSV/ZIP files.

---

## Project Structure
```
facerecogUsing FaceAPI/
├── app.js                # Main server file
├── package.json          # Node.js dependencies
├── data/                 # Data storage directory
│   ├── students_data.csv
│   ├── subjects_data.csv
│   └── attendance/       # Attendance records per subject
├── public/               # Frontend files
│   └── index.html
├── models/               # Pre-trained face recognition models
└── README.md             # Project documentation
```

---

## Installation and Setup

### Prerequisites
- Node.js installed on your system

### Steps
1. Clone the repository.
2. Navigate to the project directory.
3. Install dependencies:
   ```
   npm install
   ```
4. Start the server:
   ```
   node app.js
   ```
5. Access the application at `http://localhost:3000`.

---

## Future Enhancements
- Add real-time face recognition using a webcam.
- Integrate a database for scalable data storage.
- Enhance the frontend for a better user experience.

---

## Conclusion
The Face Recognition Attendance System is a robust and efficient solution for automating attendance tracking. It combines the power of face recognition technology with a user-friendly interface to streamline the process of managing student attendance.