import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Interview from "./pages/Interview";
import Results from "./pages/Results";
import CreateInterview from "./pages/CreateInterview";
import MyInterviews from "./pages/MyInterviews";
import QuestionBank from "./pages/QuestionBank";
import Profile from "./pages/Profile";
import Analytics from "./pages/Analytics";
import AppShell from "./components/AppShell";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/home" element={<AppShell><Home /></AppShell>} />
        <Route path="/create" element={<AppShell><CreateInterview /></AppShell>} />
        <Route path="/interviews" element={<AppShell><MyInterviews /></AppShell>} />
        <Route path="/questions" element={<AppShell><QuestionBank /></AppShell>} />
        <Route path="/analytics" element={<AppShell><Analytics /></AppShell>} />
        <Route path="/profile" element={<AppShell><Profile /></AppShell>} />
        <Route path="/interview" element={<AppShell><Interview /></AppShell>} />
        <Route path="/results" element={<AppShell><Results /></AppShell>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
