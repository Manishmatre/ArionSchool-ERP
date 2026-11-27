import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

/**
 * EditCourse forwarder:
 * Replaces the legacy multistep wizard with the unified, modular Course Details
 * layout matching Arion School SaaS, opening directly in edit mode.
 */
const EditCourse = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      navigate(`/admin/courses/${id}?edit=true`, { replace: true });
    } else {
      navigate('/admin/courses', { replace: true });
    }
  }, [id, navigate]);

  return null;
};

export default EditCourse;

