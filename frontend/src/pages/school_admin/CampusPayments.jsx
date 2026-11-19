import ManagePayments from '../admin/ManagePayments';

// Reuse the admin component with school context
const FranchisePayments = () => {
  return <ManagePayments isFranchise={true} />;
};

export default FranchisePayments;
