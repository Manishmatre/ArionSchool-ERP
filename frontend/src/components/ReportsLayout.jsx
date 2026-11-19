import { Outlet } from 'react-router-dom';
import Layout from './Layout';

const ReportsLayout = () => {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

export default ReportsLayout;
