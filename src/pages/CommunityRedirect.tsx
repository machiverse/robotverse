import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const CommunityRedirect = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    navigate(`/robobook/${id}`, { replace: true });
  }, [id, navigate]);

  return null;
};

export default CommunityRedirect;
