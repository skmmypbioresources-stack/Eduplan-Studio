import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/student" element={<StudentDashboard />} />
        {/* Default to student view for students, teacher must explicitly go to /teacher */}
        <Route path="/" element={<Navigate to="/student" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
