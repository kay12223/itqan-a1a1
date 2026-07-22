import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { EditModeProvider } from "@/context/EditModeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { useEditMode } from "@/context/EditModeContext";
import SiteNoticeBar from "@/components/SiteNoticeBar";
import OwnerPanel from "@/pages/OwnerPanel";
import OwnerSubscriptionPanel from "@/components/OwnerSubscriptionPanel";
import { EditModeCodePrompt } from "@/components/VisualEditorBar";
import AppLayout from "@/components/AppLayout";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import ManagerDashboard from "@/pages/manager/ManagerDashboard";
import Crew from "@/pages/manager/Crew";
import Attendance from "@/pages/manager/Attendance";
import Finance from "@/pages/manager/Finance";
import Operations from "@/pages/manager/Operations";
import AIMonitor from "@/pages/manager/AIMonitor";
import Subscriptions from "@/pages/manager/Subscriptions";
import CompanyProfile from "@/pages/manager/CompanyProfile";
import SettingsPage from "@/pages/manager/Settings";
import Bank from "@/pages/manager/Bank";
import QRDisplay from "@/pages/manager/QRDisplay";
import LiveMonitor from "@/pages/manager/LiveMonitor";
import DesignStudio from "@/pages/manager/DesignStudio";
import ActivityLog from "@/pages/manager/ActivityLog";
import Reports from "@/pages/manager/Reports";
import Managers from "@/pages/manager/Managers";
import LatePermissions from "@/pages/manager/LatePermissions";
import PettyCash from "@/pages/manager/PettyCash";
import ManagerRecords from "@/pages/manager/ManagerRecords";
import EmployeeFullProfile from "@/pages/manager/EmployeeFullProfile";
import CompanyStats from "@/pages/manager/CompanyStats";
import SecurityCenter from "@/pages/manager/SecurityCenter";
import DeviceTracking from "@/pages/manager/DeviceTracking";
import EmployeeDashboard from "@/pages/employee/EmployeeDashboard";
import EmployeeAttendance from "@/pages/employee/EmployeeAttendance";
import Profile from "@/pages/employee/Profile";
import MyWork from "@/pages/employee/MyWork";
import QRScan from "@/pages/employee/QRScan";
import CheckinFace from "@/pages/CheckinFace";
import SelfCheckin from "@/pages/SelfCheckin";
import AttendPage from "@/pages/AttendPage";
import AIAssistant from "@/pages/AIAssistant";
import TeamChat from "@/pages/TeamChat";
import WorkLog from "@/pages/manager/WorkLog";
import Announcements from "@/pages/Announcements";
import Leaves from "@/pages/Leaves";
import Todo from "@/pages/Todo";
import Loans from "@/pages/manager/Loans";
import MyLoans from "@/pages/employee/MyLoans";
import Spreadsheet from "@/pages/manager/Spreadsheet";
import PerformanceCenter from "@/pages/manager/PerformanceCenter";
import Branches from "@/pages/manager/Branches";
import TempAccess from "@/pages/manager/TempAccess";
import Invoices from "@/pages/manager/Invoices";
import ClientPortal from "@/pages/manager/ClientPortal";
import Shifts from "@/pages/manager/Shifts";
import LearningCenter from "@/pages/manager/LearningCenter";
import ComplianceReports from "@/pages/manager/ComplianceReports";
import Onboarding from "@/pages/Onboarding";
import PortalView from "@/pages/PortalView";

function Loader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin-slow rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-4 font-display text-sm text-muted-foreground">معايرة الأبعاد...</p>
      </div>
    </div>
  );
}

function Protected({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  const isManager = user.role === "manager" || user.role === "co_manager";
  if (role === "manager" && !isManager) return <Navigate to="/app/me" replace />;
  if (role === "member" && user.role !== "member") return <Navigate to="/app/dashboard" replace />;
  return children;
}

function App() {
  return (
    <LanguageProvider>
    <ThemeProvider>
      <EditModeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Toaster position="top-center" richColors />
            <SiteNoticeBar />
            <EditModeCodePrompt />
            <OwnerSubscriptionPanel />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/x7k-void" element={<OwnerPanel />} />
              <Route path="/checkin/:token" element={<CheckinFace />} />
              <Route path="/self-checkin/:employeeId/:token" element={<SelfCheckin />} />
              <Route path="/attend/:token" element={<AttendPage />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/portal/:token" element={<PortalView />} />
              <Route path="/app" element={<Protected><AppLayout /></Protected>}>
                {/* Manager */}
                <Route path="dashboard"       element={<Protected role="manager"><ManagerDashboard /></Protected>} />
                <Route path="crew"            element={<Protected role="manager"><Crew /></Protected>} />
                <Route path="crew/:id"        element={<Protected role="manager"><EmployeeFullProfile /></Protected>} />
                <Route path="attendance"      element={<Protected role="manager"><Attendance /></Protected>} />
                <Route path="finance"         element={<Protected role="manager"><Finance /></Protected>} />
                <Route path="operations"      element={<Protected role="manager"><Operations /></Protected>} />
                <Route path="worklog"         element={<Protected role="manager"><WorkLog /></Protected>} />
                <Route path="ai-monitor"      element={<Protected role="manager"><AIMonitor /></Protected>} />
                <Route path="subscriptions"   element={<Protected role="manager"><Subscriptions /></Protected>} />
                <Route path="company"         element={<Protected role="manager"><CompanyProfile /></Protected>} />
                <Route path="company-stats"   element={<Protected role="manager"><CompanyStats /></Protected>} />
                <Route path="settings"        element={<Protected role="manager"><SettingsPage /></Protected>} />
                <Route path="bank"            element={<Protected role="manager"><Bank /></Protected>} />
                <Route path="petty-cash"      element={<Protected role="manager"><PettyCash /></Protected>} />
                <Route path="manager-records" element={<Protected role="manager"><ManagerRecords /></Protected>} />
                <Route path="qr-display"      element={<Protected role="manager"><QRDisplay /></Protected>} />
                <Route path="live-monitor"    element={<Protected role="manager"><LiveMonitor /></Protected>} />
                <Route path="design-studio"   element={<Protected role="manager"><DesignStudio /></Protected>} />
                <Route path="activity-log"    element={<Protected role="manager"><ActivityLog /></Protected>} />
                <Route path="managers"        element={<Protected role="manager"><Managers /></Protected>} />
                <Route path="loans"           element={<Protected role="manager"><Loans /></Protected>} />
                <Route path="late-permissions" element={<Protected role="manager"><LatePermissions /></Protected>} />
                <Route path="spreadsheet"     element={<Protected role="manager"><Spreadsheet /></Protected>} />
                <Route path="performance"     element={<Protected role="manager"><PerformanceCenter /></Protected>} />
                <Route path="security"        element={<Protected role="manager"><SecurityCenter /></Protected>} />
                <Route path="device-tracking" element={<Protected role="manager"><DeviceTracking /></Protected>} />
                <Route path="branches"        element={<Protected role="manager"><Branches /></Protected>} />
                <Route path="temp-access"     element={<Protected role="manager"><TempAccess /></Protected>} />
                <Route path="invoices"        element={<Protected role="manager"><Invoices /></Protected>} />
                <Route path="client-portal"   element={<Protected role="manager"><ClientPortal /></Protected>} />
                <Route path="shifts"            element={<Protected role="manager"><Shifts /></Protected>} />
                <Route path="learning"         element={<Protected role="manager"><LearningCenter /></Protected>} />
                <Route path="compliance"       element={<Protected role="manager"><ComplianceReports /></Protected>} />
                {/* Shared */}
                <Route path="assistant"    element={<AIAssistant />} />
                <Route path="chat"         element={<TeamChat />} />
                <Route path="announcements" element={<Announcements />} />
                <Route path="leaves"       element={<Leaves />} />
                <Route path="todo"         element={<Todo />} />
                {/* Employee */}
                <Route path="me"            element={<Protected role="member"><EmployeeDashboard /></Protected>} />
                <Route path="my-work"       element={<Protected role="member"><MyWork /></Protected>} />
                <Route path="my-attendance" element={<Protected role="member"><EmployeeAttendance /></Protected>} />
                <Route path="profile"       element={<Protected role="member"><Profile /></Protected>} />
                <Route path="qr-scan"       element={<Protected role="member"><QRScan /></Protected>} />
                <Route path="my-loans"      element={<Protected role="member"><MyLoans /></Protected>} />
                <Route path="my-late-permissions" element={<Protected role="member"><LatePermissions /></Protected>} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </EditModeProvider>
    </ThemeProvider>
    </LanguageProvider>
  );
}

export default App;
