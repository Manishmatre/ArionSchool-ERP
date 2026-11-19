import EditPayment from '../admin/EditPayment';

// Reuse the payment edit component with school context
const FranchiseEditPayment = () => {
  return <EditPayment isFranchise={true} />;
};

export default FranchiseEditPayment;
