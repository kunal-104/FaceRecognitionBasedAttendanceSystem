const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { stringify } = require('csv-stringify/sync');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Data directory for storing CSV files
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

// File paths
const STUDENTS_FILE = path.join(DATA_DIR, 'students_data.csv');
const SUBJECTS_FILE = path.join(DATA_DIR, 'subjects_data.csv');
const ATTENDANCE_DIR = path.join(DATA_DIR, 'attendance');

// Ensure attendance directory exists
if (!fs.existsSync(ATTENDANCE_DIR)) {
    fs.mkdirSync(ATTENDANCE_DIR);
}

// Helper function to read CSV files
const readCSV = (filePath) => {
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(filePath)) {
            return resolve([]);
        }

        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
};

// Helper function to write to CSV files
const writeCSV = async (filePath, data) => {
    const csvString = stringify(data, { header: true });
    await fs.promises.writeFile(filePath, csvString);
};

// Helper function to get or create attendance file for a subject
const getOrCreateAttendanceFile = async (subject) => {
    const fileName = `${subject}_attendance.csv`;
    const filePath = path.join(ATTENDANCE_DIR, fileName);
    
    // If file doesn't exist, create it with student data
    if (!fs.existsSync(filePath)) {
        const students = await readCSV(STUDENTS_FILE);
        const headers = ['name', 'roll'];
        
        // Initialize attendance records with student info only
        const attendanceData = students.map(student => ({
            name: student.name,
            roll: student.roll
        }));
        
        await writeCSV(filePath, attendanceData);
    }
    
    return filePath;
};

// Helper function to update a specific student's attendance
const updateStudentAttendance = async (subject, roll, date) => {
    const filePath = await getOrCreateAttendanceFile(subject);
    const attendanceData = await readCSV(filePath);
    
    // Find student by roll number
    const studentIndex = attendanceData.findIndex(record => record.roll === roll);
    
    if (studentIndex === -1) {
        // Student not found in this attendance sheet, check if they exist in students list
        const students = await readCSV(STUDENTS_FILE);
        const student = students.find(s => s.roll === roll);
        
        if (student) {
            // Add the student to this attendance sheet
            const newRecord = {
                name: student.name,
                roll: student.roll 
            };
            newRecord[date] = 'Present';
            attendanceData.push(newRecord);
        } else {
            throw new Error(`Student with roll ${roll} not found`);
        }
    } else {
        // Student found, mark as present for this date
        attendanceData[studentIndex][date] = 'Present';
    }
    
    await writeCSV(filePath, attendanceData);
    return attendanceData;
};

// ROUTES

// Get all students
app.get('/api/students', async (req, res) => {
    try {
        const students = await readCSV(STUDENTS_FILE);
        res.json(students);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a new student
app.post('/api/students', async (req, res) => {
    try {
        const { name, roll, descriptors } = req.body;
        
        if (!name || !roll || !descriptors) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        let students = await readCSV(STUDENTS_FILE);
        
        // Check if student with the same roll already exists
        const existingIndex = students.findIndex(s => s.roll === roll);
        
        if (existingIndex !== -1) {
            // Update existing student
            students[existingIndex] = { name, roll, descriptors };
        } else {
            // Add new student
            students.push({ name, roll, descriptors });
            
            // Add student to all attendance files
            const subjects = await readCSV(SUBJECTS_FILE);
            for (const subject of subjects) {
                const filePath = await getOrCreateAttendanceFile(subject.subject);
                const attendanceData = await readCSV(filePath);
                
                // Check if student already exists in attendance
                if (!attendanceData.some(record => record.roll === roll)) {
                    attendanceData.push({
                        name: name,
                        roll: roll
                    });
                    await writeCSV(filePath, attendanceData);
                }
            }
        }
        
        await writeCSV(STUDENTS_FILE, students);
        res.status(201).json({ message: 'Student saved successfully', student: { name, roll } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Remove a student
app.delete('/api/students/:roll', async (req, res) => {
    try {
        const { roll } = req.params;
        let students = await readCSV(STUDENTS_FILE);
        
        // Remove student from students list
        students = students.filter(student => student.roll !== roll);
        await writeCSV(STUDENTS_FILE, students);
        
        // Remove student from all attendance files
        const subjects = await readCSV(SUBJECTS_FILE);
        for (const subject of subjects) {
            const filePath = path.join(ATTENDANCE_DIR, `${subject.subject}_attendance.csv`);
            if (fs.existsSync(filePath)) {
                let attendanceData = await readCSV(filePath);
                attendanceData = attendanceData.filter(record => record.roll !== roll);
                await writeCSV(filePath, attendanceData);
            }
        }
        
        res.json({ message: 'Student removed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Clear all student registrations
app.delete('/api/students', async (req, res) => {
    try {
        // Clear students file
        await writeCSV(STUDENTS_FILE, []);

        // Get all subjects
        const subjects = await readCSV(SUBJECTS_FILE);

        // Clear each subject's attendance file
        for (const subject of subjects) {
            const filePath = path.join(ATTENDANCE_DIR, `${subject.subject}_attendance.csv`);
            if (fs.existsSync(filePath)) {
                await writeCSV(filePath, []);
            }
        }

        res.json({ message: 'All student registrations cleared successfully' });
    } catch (error) {
        console.error('Error clearing student registrations:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/attendance', (req, res) => {
    try {
        if (fs.existsSync(ATTENDANCE_DIR)) {
            // Delete all files inside the attendance directory
            const files = fs.readdirSync(ATTENDANCE_DIR);
            for (const file of files) {
                fs.unlinkSync(path.join(ATTENDANCE_DIR, file));
            }
        }

        return res.status(200).json({ message: 'All attendance records deleted successfully.' });
    } catch (error) {
        console.error('Error deleting attendance records:', error);
        return res.status(500).json({ error: 'Failed to delete attendance records.' });
    }
});

// // Clear all attendance records for a specific subject
app.delete('/api/attendance/today', (req, res) => {
    const { subject } = req.body;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    if (!subject) {
        return res.status(400).json({ error: 'Missing subject in request.' });
    }

    const filePath = path.join(ATTENDANCE_DIR, `${subject}_attendance.csv`);

    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Attendance file not found.' });
        }

        const csvData = fs.readFileSync(filePath, 'utf-8').split('\n');
        const rows = csvData.map(row => row.split(','));

        // Find date column index in the header
        const dateIndex = rows[0].indexOf(today);
        if (dateIndex === -1) {
            return res.status(404).json({ error: `No attendance recorded for today (${today}).` });
        }

        // Remove the column for today from all rows
        const updatedRows = rows.map(row => {
            row.splice(dateIndex, 1);
            return row;
        });

        // Convert back to CSV string and save
        const updatedCsv = updatedRows.map(row => row.join(',')).join('\n');
        fs.writeFileSync(filePath, updatedCsv, 'utf-8');

        return res.status(200).json({ message: `Today's attendance (${today}) deleted for subject "${subject}".` });
    } catch (err) {
        console.error('Error deleting today\'s attendance column:', err);
        return res.status(500).json({ error: 'Failed to update attendance file.' });
    }
});


// Get all subjects
app.get('/api/subjects', async (req, res) => {
    try {
        // Get subjects from file
        let subjects = await readCSV(SUBJECTS_FILE);
        
        // Additionally, scan the attendance directory for existing attendance files
        const attendanceFiles = fs.readdirSync(ATTENDANCE_DIR);
        for (const file of attendanceFiles) {
            if (file.endsWith('_attendance.csv')) {
                const subjectName = file.replace('_attendance.csv', '');
                // Check if this subject already exists in our list
                if (!subjects.some(s => s.subject === subjectName)) {
                    subjects.push({ subject: subjectName });
                }
            }
        }
        
        // Save the consolidated list back to the file
        await writeCSV(SUBJECTS_FILE, subjects);
        
        res.json(subjects);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add a new subject
app.post('/api/subjects', async (req, res) => {
    try {
        const { subject } = req.body;
        
        if (!subject) {
            return res.status(400).json({ error: 'Missing subject name' });
        }
        
        let subjects = await readCSV(SUBJECTS_FILE);
        
        // Check if subject already exists
        if (subjects.some(s => s.subject === subject)) {
            return res.status(409).json({ error: 'Subject already exists' });
        }
        
        subjects.push({ subject });
        await writeCSV(SUBJECTS_FILE, subjects);
        
        // Create attendance file for this subject with all existing students
        await getOrCreateAttendanceFile(subject);
        
        res.status(201).json({ message: 'Subject added successfully', subject });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark attendance
app.post('/api/attendance', async (req, res) => {
    try {
        const { name, roll, subject, date } = req.body;
        
        if (!name || !roll || !subject || !date) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        
        const attendanceData = await updateStudentAttendance(subject, roll, date);
        res.status(201).json({ message: 'Attendance marked successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get attendance records for a specific subject and date
app.get('/api/attendance/:subject/:date', async (req, res) => {
    try {
        const { subject, date } = req.params;
        const filePath = path.join(ATTENDANCE_DIR, `${subject}_attendance.csv`);
        
        if (!fs.existsSync(filePath)) {
            return res.json([]);
        }
        
        const attendanceData = await readCSV(filePath);
        
        // Filter records that have attendance for the specified date
        const records = attendanceData.filter(record => record[date] === 'Present')
            .map(record => ({
                name: record.name,
                roll: record.roll,
                date: date,
                time: '00:00:00', // Time data not stored in our new format
                subject: subject
            }));
        
        res.json(records);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export all attendance records
app.get('/api/attendance/export/:subject', async (req, res) => {
    try {
        const { subject } = req.params;
        const filePath = path.join(ATTENDANCE_DIR, `${subject}_attendance.csv`);
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Attendance records not found' });
        }
        
        // Send the CSV file as download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${subject}_attendance.csv`);
        fs.createReadStream(filePath).pipe(res);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Export all data
app.get('/api/export', (req, res) => {
    try {
        // Create a ZIP file containing all data
        const archiver = require('archiver');
        
        res.attachment('attendance_system_data.zip');
        
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });
        
        archive.pipe(res);
        
        // Add students file
        if (fs.existsSync(STUDENTS_FILE)) {
            archive.file(STUDENTS_FILE, { name: 'students_data.csv' });
        }
        
        // Add subjects file
        if (fs.existsSync(SUBJECTS_FILE)) {
            archive.file(SUBJECTS_FILE, { name: 'subjects_data.csv' });
        }
        
        // Add all attendance files
        if (fs.existsSync(ATTENDANCE_DIR)) {
            archive.directory(ATTENDANCE_DIR, 'attendance');
        }
        
        archive.finalize();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});