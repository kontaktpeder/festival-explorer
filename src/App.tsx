import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import Index from "./pages/Index";
import FestivalPage from "./pages/FestivalPage";
import EventPage from "./pages/EventPage";
import ProjectPage from "./pages/ProjectPage";
import ExplorePage from "./pages/ExplorePage";
import SearchPage from "./pages/SearchPage";
import AcceptInvitation from "./pages/AcceptInvitation";
import Dashboard from "./pages/dashboard/Dashboard";
import MyPersonas from "./pages/dashboard/MyPersonas";
import PersonaEdit from "./pages/dashboard/PersonaEdit";
import EntityEdit from "./pages/dashboard/EntityEdit";
import EntityInvite from "./pages/dashboard/EntityInvite";
import Settings from "./pages/dashboard/Settings";
import ChangePassword from "./pages/dashboard/ChangePassword";
import AccountCenter from "./pages/dashboard/AccountCenter";
import Privacy from "./pages/dashboard/Privacy";
import PersonaPage from "./pages/PersonaPage";
import NotFound from "./pages/NotFound";
import TicketsPage from "./pages/TicketsPage";
import SuccessPage from "./pages/SuccessPage";
import TicketViewPage from "./pages/TicketViewPage";

// Admin pages
import AdminLayout from "./pages/admin/AdminLayout";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminFestivals from "./pages/admin/AdminFestivals";
import AdminSections from "./pages/admin/AdminSections";
import AdminFestivalProgram from "./pages/admin/AdminFestivalProgram";
import AdminEvents from "./pages/admin/AdminEvents";
import AdminEventEdit from "./pages/admin/AdminEventEdit";
import AdminEventLineup from "./pages/admin/AdminEventLineup";
import AdminEntities from "./pages/admin/AdminEntities";
import AdminEntityEdit from "./pages/admin/AdminEntityEdit";
import AdminAccessGenerator from "./pages/admin/AdminAccessGenerator";
// Legacy - kept for backwards compatibility
import AdminProjects from "./pages/admin/AdminProjects";
import AdminProjectEdit from "./pages/admin/AdminProjectEdit";
import AdminVenues from "./pages/admin/AdminVenues";
import AdminVenueEdit from "./pages/admin/AdminVenueEdit";
import AdminMedia from "./pages/admin/AdminMedia";
import AdminTimelineEvents from "./pages/admin/AdminTimelineEvents";
import AdminTimelineEventEdit from "./pages/admin/AdminTimelineEventEdit";

// Redirect component for legacy /venue/:slug routes
function VenueRedirect() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/project/${slug}`} replace />;
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/festival/:slug" element={<FestivalPage />} />
          <Route path="/event/:slug" element={<EventPage />} />
          <Route path="/project/:slug" element={<ProjectPage />} />
          <Route path="/venue/:slug" element={<VenueRedirect />} />
          {/* TODO: Reaktiver etter MVP - explore blir global navigasjon */}
          {/* <Route path="/explore" element={<ExplorePage />} /> */}
          <Route path="/search" element={<SearchPage />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/t/:ticketCode" element={<TicketViewPage />} />
          <Route path="/accept-invitation" element={<AcceptInvitation />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/entities/:id/edit" element={<EntityEdit />} />
          <Route path="/dashboard/entities/:id/invite" element={<EntityInvite />} />
          <Route path="/dashboard/personas" element={<MyPersonas />} />
          <Route path="/dashboard/personas/new" element={<PersonaEdit />} />
          <Route path="/dashboard/personas/:id" element={<PersonaEdit />} />
          <Route path="/dashboard/settings" element={<Settings />} />
          <Route path="/dashboard/settings/change-password" element={<ChangePassword />} />
          <Route path="/dashboard/account" element={<AccountCenter />} />
          <Route path="/dashboard/privacy" element={<Privacy />} />
          <Route path="/p/:slug" element={<PersonaPage />} />
          
          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="festivals" element={<AdminFestivals />} />
            <Route path="festivals/:id" element={<AdminSections />} />
            <Route path="festivals/:id/program" element={<AdminFestivalProgram />} />
            <Route path="events" element={<AdminEvents />} />
            <Route path="events/:id" element={<AdminEventEdit />} />
            <Route path="events/:id/lineup" element={<AdminEventLineup />} />
            {/* New entities routes */}
            <Route path="entities" element={<AdminEntities />} />
            <Route path="entities/:id" element={<AdminEntityEdit />} />
            <Route path="access-generator" element={<AdminAccessGenerator />} />
            {/* Legacy routes - redirect to entities in future */}
            <Route path="projects" element={<AdminProjects />} />
            <Route path="projects/:id" element={<AdminProjectEdit />} />
            <Route path="venues" element={<AdminVenues />} />
            <Route path="venues/:id" element={<AdminVenueEdit />} />
            <Route path="media" element={<AdminMedia />} />
            <Route path="timeline" element={<AdminTimelineEvents />} />
            <Route path="timeline/:id" element={<AdminTimelineEventEdit />} />
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
