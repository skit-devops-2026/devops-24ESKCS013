-- CampusConnect Database Schema
-- Run this once to create all tables

CREATE DATABASE IF NOT EXISTS campusconnect;
USE campusconnect;

-- Users table: stores both admin and student accounts
CREATE TABLE IF NOT EXISTS Users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'student') NOT NULL DEFAULT 'student',
  college_name VARCHAR(150),
  branch VARCHAR(100),
  year INT,
  semester INT,
  roll_no VARCHAR(50),
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- OTPs table: stores 6-digit OTPs for email verification & password reset
CREATE TABLE IF NOT EXISTS OTPs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(150) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  purpose ENUM('verify', 'reset') NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subjects table: subjects tied to a branch and semester
CREATE TABLE IF NOT EXISTS Subjects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  branch VARCHAR(100) NOT NULL,
  semester INT NOT NULL
);

-- Notes table: student-uploaded notes files
CREATE TABLE IF NOT EXISTS Notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  uploaded_by INT NOT NULL,
  subject_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  likes_count INT DEFAULT 0,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES Subjects(id) ON DELETE CASCADE
);

-- Attendance table: tracks attended vs total classes per subject per student
CREATE TABLE IF NOT EXISTS Attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  subject_id INT NOT NULL,
  total_classes INT DEFAULT 0,
  attended_classes INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_student_subject (student_id, subject_id),
  FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES Subjects(id) ON DELETE CASCADE
);

-- Tasks table: student task tracker
CREATE TABLE IF NOT EXISTS Tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  subject_id INT,
  title VARCHAR(200) NOT NULL,
  category ENUM('assignment', 'revision', 'reading', 'exam_prep') NOT NULL,
  due_date DATE NOT NULL,
  status ENUM('pending', 'completed', 'missed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE,
  FOREIGN KEY (subject_id) REFERENCES Subjects(id) ON DELETE SET NULL
);

-- MonthlyReports table: snapshot of task & attendance performance each month
CREATE TABLE IF NOT EXISTS MonthlyReports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  month INT NOT NULL,
  year INT NOT NULL,
  tasks_total INT DEFAULT 0,
  tasks_completed INT DEFAULT 0,
  completion_pct DECIMAL(5,2) DEFAULT 0,
  attendance_pct DECIMAL(5,2) DEFAULT 0,
  feedback TEXT,
  worst_subject VARCHAR(150),
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Notices table: admin posts announcements visible to all students
CREATE TABLE IF NOT EXISTS Notices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  posted_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (posted_by) REFERENCES Users(id) ON DELETE CASCADE
);

-- Seed data: default admin account (password: Admin@123)
INSERT IGNORE INTO Users (name, email, password_hash, role, is_verified)
VALUES (
  'Admin',
  'admin@campusconnect.com',
  '$2b$10$YI7oBBkCTHRjEFUGH.tCMuHo.oPJKN78FHlzYB7WIPlVjr0Qu8i5i',
  'admin',
  TRUE
);

-- Seed some subjects for demo
INSERT IGNORE INTO Subjects (name, branch, semester) VALUES
  ('Data Structures', 'CSE', 3),
  ('Operating Systems', 'CSE', 4),
  ('Database Management', 'CSE', 4),
  ('Computer Networks', 'CSE', 5),
  ('Machine Learning', 'CSE', 6),
  ('Engineering Mathematics', 'ECE', 3),
  ('Digital Electronics', 'ECE', 3),
  ('Mechanics', 'MECH', 2);
