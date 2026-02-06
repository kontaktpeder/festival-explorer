import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LoadingState } from "@/components/ui/LoadingState";

// Redirect to default festival for MVP
export default function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/festival", { replace: true });
  }, [navigate]);

  return <LoadingState message="Velkommen til universet..." />;
}
